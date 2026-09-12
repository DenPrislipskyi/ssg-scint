import type { LeadTime } from '@/entities/quote/model/types';
import type { SupplierId } from '@/entities/supplier/model/types';
import raw from '@/shared/api/mock/fixtures/demo-supplier-replies.json';

export interface DemoSupplierReply {
  supplierId: SupplierId;
  unitPrice: number | null;
  leadTime: LeadTime | null;
  validity: string;
  remarks: string | null;
  supplierDescription: string;
  brand: string;
  unit: string | null;
  quantityFactor: number;
  infoRequest: string | null;
}

/** Демо-відповіді постачальників, індексовані за id — тільки для mock-режиму. */
const demoSupplierReplies: Record<SupplierId, DemoSupplierReply> = Object.fromEntries(
  (raw as DemoSupplierReply[]).map((reply) => [reply.supplierId, reply]),
);

export default demoSupplierReplies;
