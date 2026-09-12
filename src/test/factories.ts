import type { CatalogData, CatalogItem } from '@/entities/catalog/model/types';
import type { LineSupplier, QuoteLine, SupplierOffer } from '@/entities/quote/model/types';

export const makeItem = (overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  code: 'T69128400',
  name: 'Hex head bolt',
  inStock: true,
  costPrice: 0.42,
  unit: 'set',
  ...overrides,
});

export const makeCatalog = (items: CatalogItem[] = [makeItem()]): CatalogData => ({
  items,
  itemsByCode: Object.fromEntries(items.map((item) => [item.code, item])),
  packSpecs: {},
  conversions: { 'cm>m': 0.01, 'm>cm': 100, 't>kg': 1000 },
  units: ['pcs', 'set', 'm', 'kg'],
});

export const makeOffer = (overrides: Partial<SupplierOffer> = {}): SupplierOffer => ({
  unitPrice: 10,
  leadTime: { days: 3, hours: 0 },
  validity: '30 d',
  remarks: null,
  supplierDescription: 'Supplier description',
  brand: 'Brand',
  unit: 'set',
  quotedQuantity: 100,
  ...overrides,
});

export const makeLineSupplier = (overrides: Partial<LineSupplier> = {}): LineSupplier => ({
  supplierId: 'lianseng',
  status: 'assigned',
  offer: null,
  infoRequest: null,
  isInfoResolved: false,
  isIgnored: false,
  isSelected: false,
  followUpNote: null,
  repliedAt: null,
  ...overrides,
});

export const makeLine = (overrides: Partial<QuoteLine> = {}): QuoteLine => ({
  id: 'L1',
  customerDescription: 'Hex bolts M16',
  customerCode: '691284',
  requestedQuantity: 500,
  customerUnit: 'set',
  matchedItemCode: null,
  suggestedItemCodes: [],
  rejectedItemCodes: [],
  suppliers: [],
  attachment: null,
  customerRemark: null,
  clarificationQuestion: null,
  note: null,
  isAsked: false,
  isExcluded: false,
  internalComment: '',
  messages: [],
  manualShipSupplyQuantity: null,
  overriddenUnit: null,
  ...overrides,
});
