import type { Quote } from '@/entities/quote/model/types';

export const ORDER_STEPS = [
  'Quote Sent',
  'Reply',
  'Revised',
  'Accepted',
  'Order',
  'Ready for Procurement',
  'Closed',
] as const;

/** Індекс поточного кроку в життєвому циклі. -1 — котирування ще не відправлене. */
export const currentOrderStep = (quote: Quote): number => {
  if (!quote.sentAt) return -1;
  if (!quote.hasCustomerReply) return 0;
  if (quote.orderStage === 'ready') return 5;
  if (quote.orderStage) return 4;
  if (quote.acceptedAt) return 3;
  if (quote.revisedAt) return 2;
  return 1;
};
