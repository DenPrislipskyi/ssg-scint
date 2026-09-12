import type { ComponentType, SVGProps } from 'react';

import {
  IconAsk,
  IconBad,
  IconInfo,
  IconNeutral,
  IconOk,
  IconOkFilled,
  IconReplied,
  IconTriangle,
  IconVariant,
  IconWait,
} from '@/shared/ui/icons';
import type { LineStatus, QuoteStatus } from '@/entities/quote/model/types';

export type Tone = 'ok' | 'warn' | 'bad' | 'sup' | 'ns' | 'info' | 'muted';

export interface StatusMeta {
  label: string;
  tone: Tone;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Єдиний словник для іконок, ярликів і кольорів статусу рядка. */
export const LINE_STATUS_META: Record<LineStatus, StatusMeta> = {
  ready: { label: 'Ready', tone: 'ok', Icon: IconOk },
  chooseVariant: { label: 'Choose variant', tone: 'warn', Icon: IconVariant },
  notFound: { label: 'Not found', tone: 'bad', Icon: IconBad },
  askedCustomer: { label: 'Asked customer', tone: 'ns', Icon: IconAsk },
  needsSupplier: { label: 'Needs supplier', tone: 'ns', Icon: IconTriangle },
  inquirySent: { label: 'Web Inquiry sent', tone: 'sup', Icon: IconWait },
  selectSupplier: { label: 'Select supplier', tone: 'sup', Icon: IconReplied },
  supplierNeedsInfo: { label: 'Supplier needs info', tone: 'info', Icon: IconInfo },
  supplierSelected: { label: 'Supplier selected', tone: 'ok', Icon: IconOkFilled },
  excluded: { label: 'Excluded', tone: 'muted', Icon: IconNeutral },
};

export const QUOTE_STATUS_META: Record<QuoteStatus, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'muted' },
  inProgress: { label: 'In progress', tone: 'warn' },
  awaitingSuppliers: { label: 'Waiting for suppliers', tone: 'sup' },
  supplierNeedsInfo: { label: 'Supplier needs info', tone: 'info' },
  clarificationSent: { label: 'Clarification sent', tone: 'ns' },
  quoteSent: { label: 'Quote Sent', tone: 'ok' },
  replyReceived: { label: 'Reply received', tone: 'warn' },
  order: { label: 'Order', tone: 'ok' },
};
