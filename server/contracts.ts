import { z } from 'zod';
import {
  createBranchSchema,
  createTenantSchema,
  updateBranchSchema,
} from '../src/core/pilot/tenants';
import type { Command } from '../src/core/pilot/engine';
import { onlinePaymentSchema } from '../src/core/pilot/payments';
import {
  priceRuleSchema,
  publishPriceSchema,
  archivePriceSchema,
} from '../src/core/pilot/pricing';
import {
  voucherSchema,
  saleSchema,
  saleDecisionSchema,
} from '../src/core/pilot/promotions';
import {
  quoteSchema,
  orderSchema,
  orderIdSchema,
  cancelOrderSchema,
  branchSchema,
  shiftSchema,
  closeShiftSchema,
  cashSchema,
  ticketSchema,
  confirmServiceSchema,
  feesSchema,
} from '../src/core/pilot/orders';

const id = z.string().min(1).max(100);
const name = z.string().trim().min(1).max(100);
const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const role = z.enum(['owner', 'manager', 'cashier', 'server']);
const branchIds = z
  .array(id)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length);
const password = z.string().min(12).max(100);
const brand = z
  .object({
    displayName: name,
    logoUrl: z.string().max(1000).nullable(),
    primary: z.string().max(7),
    background: z.string().max(7),
    text: z.string().max(7),
  })
  .strict();
const empty = z.object({}).strict();
export const signInSchema = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(100) })
  .strict();

/** Explicit allowlist. Adding a core command never exposes it automatically. */
export const contracts = {
  savePriceRule: { auth: 'staff', schema: priceRuleSchema },
  publishPriceRule: { auth: 'staff', schema: publishPriceSchema },
  archivePriceRule: { auth: 'staff', schema: archivePriceSchema },
  listPriceRules: { auth: 'staff', schema: branchSchema },
  createVoucher: { auth: 'staff', schema: voucherSchema },
  proposeSale: { auth: 'staff', schema: saleSchema },
  approveSale: { auth: 'staff', schema: saleDecisionSchema },
  stopSale: { auth: 'staff', schema: saleDecisionSchema },
  listOffers: { auth: 'staff', schema: branchSchema },
  startOnlinePayment: { auth: 'staff', schema: onlinePaymentSchema },
  resumeOnlinePayment: { auth: 'staff', schema: orderIdSchema },
  recheckPayment: { auth: 'staff', schema: orderIdSchema },
  listPaymentExceptions: { auth: 'staff', schema: branchSchema },
  configureFees: { auth: 'staff', schema: feesSchema },
  createQuote: { auth: 'staff', schema: quoteSchema },
  createOrder: { auth: 'staff', schema: orderSchema },
  getOrder: { auth: 'staff', schema: orderIdSchema },
  listOrders: { auth: 'staff', schema: branchSchema },
  cancelOrder: { auth: 'staff', schema: cancelOrderSchema },
  openShift: { auth: 'staff', schema: shiftSchema },
  listShifts: { auth: 'staff', schema: branchSchema },
  closeShift: { auth: 'staff', schema: closeShiftSchema },
  confirmCash: { auth: 'staff', schema: cashSchema },
  listTickets: { auth: 'staff', schema: branchSchema },
  confirmService: { auth: 'staff', schema: confirmServiceSchema },
  advanceTicket: { auth: 'staff', schema: ticketSchema },
  me: { auth: 'staff', schema: empty },
  staffSignOut: { auth: 'staff', schema: empty },
  platformSignOut: { auth: 'platform', schema: empty },
  listTenants: { auth: 'platform', schema: empty },
  createTenant: { auth: 'platform', schema: createTenantSchema },
  createBranch: { auth: 'staff', schema: createBranchSchema },
  updateBranch: { auth: 'staff', schema: updateBranchSchema },
  listStaff: { auth: 'staff', schema: empty },
  inviteStaff: {
    auth: 'staff',
    schema: z
      .object({ name, email: z.email().max(254), password, role, branchIds })
      .strict(),
  },
  updateStaff: {
    auth: 'staff',
    schema: z.object({ staffId: id, role, branchIds }).strict(),
  },
  revokeStaff: { auth: 'staff', schema: z.object({ staffId: id }).strict() },
  resetStaffPassword: {
    auth: 'staff',
    schema: z.object({ staffId: id, password }).strict(),
  },
  updateBrand: { auth: 'staff', schema: z.object({ brand }).strict() },
  getCatalogue: { auth: 'staff', schema: empty },
  saveCategory: {
    auth: 'staff',
    schema: z
      .object({
        id: id.optional(),
        name,
        sort: z.number().int().min(0).max(10000),
      })
      .strict(),
  },
  saveItem: {
    auth: 'staff',
    schema: z
      .object({
        id: id.optional(),
        categoryId: id,
        name,
        kind: z.enum(['food_drink', 'service']),
        price: money,
        sizes: z.array(z.object({ id, name, price: money }).strict()).max(20),
        modifierGroups: z
          .array(
            z
              .object({
                id,
                name,
                options: z
                  .array(z.object({ id, name, priceDelta: money }).strict())
                  .max(20),
              })
              .strict(),
          )
          .max(20),
        limited: z.boolean(),
      })
      .strict(),
  },
  archiveItem: { auth: 'staff', schema: z.object({ itemId: id }).strict() },
  setSoldOut: {
    auth: 'staff',
    schema: z.object({ itemId: id, soldOut: z.boolean() }).strict(),
  },
  getLayout: { auth: 'staff', schema: z.object({ branchId: id }).strict() },
  setTenantStatus: {
    auth: 'platform',
    schema: z
      .object({
        tenantId: id,
        status: z.enum(['active', 'suspended']),
        reason: name,
      })
      .strict(),
  },
} as const satisfies Partial<
  Record<Command, { auth: 'staff' | 'platform'; schema: z.ZodType }>
>;
export type ApiCommand = keyof typeof contracts;
export const customerContracts = {
  startOnlinePayment: onlinePaymentSchema,
  resumeOnlinePayment: orderIdSchema,
  recheckPayment: orderIdSchema,
  createQuote: quoteSchema,
  createOrder: orderSchema,
  getOrder: orderIdSchema,
  cancelOrder: cancelOrderSchema,
} as const;
export type CustomerCommand = keyof typeof customerContracts;
