import { describe, expect, it } from 'vitest';
import { calculateSeatTimeTotal } from '../src/core/billing';
import {
  createPilotEngine,
  type Input,
  type Reply,
} from '../src/core/pilot/engine';
import { createPilotWorld } from '../src/core/pilot/fixtures';
import { seatPriceSegments } from '../src/core/pilot/pricing';
import { parseLocalInput } from '../src/core/pilot/dateInput';
import type { Tx } from '../src/core/pilot/types';

function data<T>(reply: Reply<T>): T {
  if (!reply.ok) throw new Error(reply.error.code);
  return reply.data;
}
function setup() {
  const now = parseLocalInput('2026-11-16 10:00')!;
  const world = createPilotWorld(now);
  const engine = createPilotEngine(world, {}, () => now);
  const branch = world.db.branches[0]!,
    tier = branch.tiers[0]!;
  const login = (role: string) => ({
    staffToken: data(
      engine.execute('staffSignIn', {
        email: `${role}@${branch.tenantId}.demo.test`,
        password: 'demo-password',
      }),
    ).token,
  });
  const owner = login('owner');
  const save = (patch: Partial<Input<'savePriceRule'>> = {}) =>
    data(
      engine.execute(
        'savePriceRule',
        {
          branchId: branch.id,
          tierId: null,
          days: null,
          from: '10:00',
          to: '12:00',
          validFrom: null,
          validTo: null,
          hourlyRate: 20000,
          priority: 0,
          ...patch,
        },
        owner,
      ),
    );
  const publish = (ruleId: string, replaceId?: string) =>
    engine.execute('publishPriceRule', { ruleId, replaceId }, owner);
  const segments = (from: string, to: string) => {
    const tx: Tx = {
      ...engine.snapshot(),
      now,
      deps: {},
      auth: {},
      keep: () => {
        throw new Error('No effects expected');
      },
    };
    return seatPriceSegments(
      tx,
      branch,
      tier.id,
      parseLocalInput(from)!,
      parseLocalInput(to)!,
    );
  };
  return { engine, world, branch, tier, owner, save, publish, segments, login };
}
describe('server seat pricing', () => {
  it('splits time bands with narrow scope precedence and snapshots whole-line rounding', () => {
    const s = setup();
    const global = s.save({
      branchId: null,
      from: '00:00',
      to: '24:00',
      hourlyRate: 40000,
      priority: 100,
    });
    data(s.publish(global.id));
    const branch = s.save();
    data(s.publish(branch.id));
    const tier = s.save({
      tierId: s.tier.id,
      from: '11:00',
      to: '11:30',
      hourlyRate: 30000,
    });
    data(s.publish(tier.id));
    const segments = s.segments('2026-11-16 09:30', '2026-11-16 12:30');
    expect(segments.map((p) => [p.minutes, p.hourlyRate])).toEqual([
      [30, 40000],
      [60, 20000],
      [30, 30000],
      [30, 20000],
      [30, 40000],
    ]);
    expect(calculateSeatTimeTotal(segments)).toBe(85000);
    data(s.engine.execute('archivePriceRule', { ruleId: tier.id }, s.owner));
    expect(calculateSeatTimeTotal(segments)).toBe(85000);
    expect(
      calculateSeatTimeTotal(
        s.segments('2026-11-16 09:30', '2026-11-16 12:30'),
      ),
    ).toBe(80000);
    expect(
      calculateSeatTimeTotal([
        { from: 0, to: 1000, hourlyRate: 10001 },
        { from: 1000, to: 2000, hourlyRate: 10001 },
      ]),
    ).toBe(6);
  });
  it('refuses overlapping published rules and replaces atomically without a live-price gap', () => {
    const s = setup();
    const a = s.save();
    data(s.publish(a.id));
    const b = s.save({ from: '11:00', hourlyRate: 25000 });
    expect(s.publish(b.id)).toMatchObject({ error: { code: 'RULE_OVERLAP' } });
    expect(
      s.engine.snapshot().db.priceRules.find((r) => r.id === a.id)!.status,
    ).toBe('published');
    data(s.publish(b.id, a.id));
    expect(
      s.engine.snapshot().db.priceRules.find((r) => r.id === a.id)!.status,
    ).toBe('archived');
    const adjacent = s.save({ from: '12:00', to: '13:00' });
    data(s.publish(adjacent.id));
    expect(
      s.engine.execute(
        'savePriceRule',
        { ...a, hourlyRate: 35000 } as never,
        s.owner,
      ),
    ).toMatchObject({ ok: false });
  });
  it('checks actual weekdays and inclusive effective dates across local midnight', () => {
    const s = setup();
    const monday = s.save({
      days: [1],
      validFrom: '2026-11-16',
      validTo: '2026-11-16',
      from: '23:00',
      to: '24:00',
    });
    data(s.publish(monday.id));
    const tuesday = s.save({
      days: [2],
      validFrom: '2026-11-17',
      validTo: '2026-11-17',
      from: '00:00',
      to: '01:00',
      hourlyRate: 40000,
    });
    data(s.publish(tuesday.id));
    expect(
      s
        .segments('2026-11-16 23:30', '2026-11-17 00:30')
        .map((p) => [p.minutes, p.hourlyRate]),
    ).toEqual([
      [30, 20000],
      [30, 40000],
    ]);
    const inactive = s.save({
      days: [2],
      validFrom: '2026-11-16',
      validTo: '2026-11-16',
      from: '23:00',
      to: '24:00',
    });
    expect(s.publish(inactive.id).ok).toBe(true);
  });
  it('rejects foreign branches, cashier writes, invalid dates and rates below the floor', () => {
    const s = setup();
    const rule = s.save();
    expect(
      s.engine.execute(
        'publishPriceRule',
        { ruleId: rule.id },
        s.login('cashier'),
      ),
    ).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(() => s.save({ hourlyRate: 9999 })).toThrow('GUARDRAIL');
    expect(() => s.save({ validFrom: '2026-02-30' })).toThrow('VALIDATION');
    expect(() =>
      s.save({
        branchId: s.world.db.branches.find(
          (b) => b.tenantId !== s.branch.tenantId,
        )!.id,
      }),
    ).toThrow('NOT_FOUND');
    expect(() => s.save({ from: '22:00', to: '06:00' })).toThrow('GUARDRAIL');
  });
});
