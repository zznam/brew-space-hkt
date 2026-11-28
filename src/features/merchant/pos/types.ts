export type PosOrderStatus =
  | 'draft'
  /** F211: set aside to serve someone else; holds no seat and can be resumed. */
  | 'parked'
  | 'awaiting_payment'
  | 'paid'
  | 'completed'
  | 'cancelled';
export type FulfillmentStatus = 'queued' | 'preparing' | 'ready' | 'served';
export type PaymentMethod = 'cash' | 'online';

export interface PosOrderLine {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface PosOrder {
  id: string;
  venueId: string;
  seatId: string | null;
  lines: PosOrderLine[];
  status: PosOrderStatus;
  fulfillment: FulfillmentStatus | null;
  paymentMethod: PaymentMethod | null;
  createdAt: number;
}
