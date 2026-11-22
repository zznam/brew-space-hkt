import { rateLimit } from './access';
import type { AiRun, Tenant, Tx } from './types';
import { nextId } from './util';

export const AI_MODEL = 'demo-adapter';
export const PROMPT_VERSION = {
  classify: 'classify-v1',
  suggest: 'suggest-v1',
} as const;

/** Removes contact details and names before any text reaches AI (F185). */
export function stripPersonalData(text: string, names: string[] = []): string {
  let out = text.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]');
  out = out.replace(/(?:\+?\d[\s.-]?){9,12}/g, '[phone] ');
  out = out.replace(
    /\b(my name is|i am|i'm|this is|tên tôi là|tên mình là|tôi là|mình là|em là)\s+(\p{Lu}[\p{L}]*(?:\s+\p{Lu}[\p{L}]*){0,3})/giu,
    '$1 [name]',
  );
  for (const name of names)
    if (name.trim().length > 1) out = out.split(name.trim()).join('[name]');
  return out.replace(/\s+/g, ' ').trim();
}

export interface AiResult<T> {
  value: T | null;
  run: AiRun;
}
/** One guarded AI call. It never throws: with AI switched off (F182), over
 * budget (F183), timing out or returning the wrong shape, `value` is `null`
 * and the caller falls back to rules. Every call is logged (F184). */
export function callAi<T>(
  tx: Tx,
  tenant: Tenant,
  kind: AiRun['kind'],
  rawInput: string,
  parse: (output: unknown) => T | null,
  names: string[] = [],
): AiResult<T> {
  const run: AiRun = {
    id: nextId(tx.db, 'air'),
    tenantId: tenant.id,
    kind,
    model: AI_MODEL,
    promptVersion: PROMPT_VERSION[kind],
    input: stripPersonalData(rawInput, names).slice(0, 500),
    output: '',
    validation: 'ok',
    approverId: null,
    correction: null,
    at: tx.now,
  };
  tx.db.aiRuns.push(run);
  const skip = (validation: AiRun['validation']): AiResult<T> => {
    run.validation = validation;
    return { value: null, run };
  };
  if (!tenant.settings.aiEnabled || !tx.deps.ai) return skip('skipped_off');
  if (tenant.settings.aiSpent >= tenant.settings.aiBudget)
    return skip('skipped_budget');
  try {
    rateLimit(tx, 'ai', tenant.id);
  } catch {
    return skip('skipped_budget');
  }
  tenant.settings.aiSpent += 1;
  let result: ReturnType<NonNullable<Tx['deps']['ai']>>;
  try {
    result = tx.deps.ai(kind, run.input);
  } catch {
    return skip('timeout');
  }
  if ('error' in result) return skip('timeout');
  try {
    run.output = stripPersonalData(
      JSON.stringify(result.output ?? null),
      names,
    ).slice(0, 1000);
    const value = parse(result.output);
    if (value === null) return skip('malformed');
    return { value, run };
  } catch {
    return skip('malformed');
  }
}
