/** In-memory demo command runner. No network, durable database or production auth. */
import * as access from './access';
import * as catalogue from './catalogue';
import * as layout from './layout';
import * as tenants from './tenants';
import * as orders from './orders';
import * as payments from './payments';
import * as promotions from './promotions';
import * as pricing from './pricing';
import { PilotError, type ErrorCode } from './errors';
import type { Auth, Db, Deps, Tx, World } from './types';

export const commands = {
  savePriceRule: pricing.savePriceRule,
  publishPriceRule: pricing.publishPriceRule,
  archivePriceRule: pricing.archivePriceRule,
  listPriceRules: pricing.listPriceRules,
  createVoucher: promotions.createVoucher,
  proposeSale: promotions.proposeSale,
  approveSale: promotions.approveSale,
  stopSale: promotions.stopSale,
  listOffers: promotions.listOffers,
  startOnlinePayment: payments.startOnlinePayment,
  resumeOnlinePayment: payments.resumeOnlinePayment,
  recheckPayment: payments.recheckPayment,
  paymentContext: payments.paymentContext,
  pendingOnlinePayments: payments.pendingOnlinePayments,
  claimPaymentQuery: payments.claimPaymentQuery,
  applyPaymentEvidence: payments.applyPaymentEvidence,
  expireUnpaidOrders: payments.expireUnpaidOrders,
  listPaymentExceptions: payments.listPaymentExceptions,
  configureFees: orders.configureFees,
  createQuote: orders.createQuote,
  createOrder: orders.createOrder,
  getOrder: orders.getOrder,
  listOrders: orders.listOrders,
  cancelOrder: orders.cancelOrder,
  openShift: orders.openShift,
  listShifts: orders.listShifts,
  closeShift: orders.closeShift,
  confirmCash: orders.confirmCash,
  processFulfilment: orders.processFulfilment,
  listTickets: orders.listTickets,
  confirmService: orders.confirmService,
  advanceTicket: orders.advanceTicket,
  staffSignIn: access.staffSignIn,
  staffSignOut: access.staffSignOut,
  me: access.me,
  inviteStaff: access.inviteStaff,
  updateStaff: access.updateStaff,
  revokeStaff: access.revokeStaff,
  resetStaffPassword: access.resetStaffPassword,
  listStaff: access.listStaff,
  updateBrand: access.updateBrand,
  platformSignIn: access.platformSignIn,
  platformSignOut: access.platformSignOut,
  createTenant: tenants.createTenant,
  createBranch: tenants.createBranch,
  updateBranch: tenants.updateBranch,
  listTenants: access.listTenants,
  setTenantStatus: access.setTenantStatus,
  createSupportGrant: access.createSupportGrant,
  platformReadTenant: access.platformReadTenant,
  listAudit: access.listAudit,
  setRetention: access.setRetention,
  setAiBudget: access.setAiBudget,
  listOpsAlerts: access.listOpsAlerts,
  reportClientError: access.reportClientError,
  getLayout: layout.getLayout,
  saveLayoutDraft: layout.saveLayoutDraft,
  publishLayout: layout.publishLayout,
  rollbackLayout: layout.rollbackLayout,
  publicLayout: layout.publicLayout,
  approveAsset: layout.approveAsset,
  getAsset: layout.getAsset,
  resolveQr: layout.resolveQr,
  qrSheet: layout.qrSheet,
  rotateQr: layout.rotateQr,
  saveCategory: catalogue.saveCategory,
  saveItem: catalogue.saveItem,
  archiveItem: catalogue.archiveItem,
  setSoldOut: catalogue.setSoldOut,
  getCatalogue: catalogue.getCatalogue,
  publicVenue: catalogue.publicVenue,
  snapshotItem: catalogue.snapshotItem,
} as const;

type Commands = typeof commands;
export type Command = keyof Commands;
export type Input<K extends Command> = Parameters<Commands[K]>[1];
export type Output<K extends Command> = ReturnType<Commands[K]>;
export type Reply<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: ErrorCode; message: string; details?: unknown };
    };
const copy = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

/** Commands run synchronously against a private copy and commit atomically.
 * Refusals discard domain changes while preserving rate hits and redacted logs.
 * Caller-owned inputs, responses and snapshots never alias the live state. */
export function createPilotEngine(
  initial: World,
  deps: Deps = {},
  clock = () => Date.now(),
) {
  let world = copy(initial);
  return {
    snapshot: (): World => copy(world),
    execute<K extends Command>(
      command: K,
      input: Input<K>,
      auth: Auth = {},
    ): Reply<ReturnType<Commands[K]>> {
      const draft = copy(world);
      const effects: ((db: Db) => void)[] = [];
      const tx: Tx = {
        ...draft,
        now: clock(),
        auth: copy(auth),
        deps,
        keep(effect) {
          effect(draft.db);
          effects.push(effect);
        },
      };
      try {
        // The public method retains each command's input/output types.
        const run = commands[command] as (tx: Tx, input: unknown) => unknown;
        const data = copy(run(tx, copy(input)));
        world = draft;
        return { ok: true, data: data as ReturnType<Commands[K]> };
      } catch (error) {
        for (const effect of effects) effect(world.db);
        if (error instanceof PilotError)
          return {
            ok: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          };
        return {
          ok: false,
          error: {
            code: 'INTERNAL',
            message: 'The command could not be completed.',
          },
        };
      }
    },
  };
}
