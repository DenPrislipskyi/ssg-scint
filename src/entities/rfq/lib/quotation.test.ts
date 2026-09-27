import { describe, expect, it } from 'vitest';

import {
  issuerOf,
  PICK_FORMAT,
  quotationDate,
  quotationFileName,
  quotationTerms,
  whyNotDownloadable,
} from '@/entities/rfq/lib/quotation';

describe('issuerOf', () => {
  it('speaks for the Singapore office on the SG form', () => {
    expect(issuerOf('SG standard')).toBe('Seven Seas Group · Singapore');
  });

  it('speaks for the Dubai office on the UAE form', () => {
    expect(issuerOf('UAE standard')).toBe('Seven Seas Group · Dubai / Fujairah');
  });

  it("says the customer's file is theirs, not our letterhead", () => {
    expect(issuerOf('Customer file (.xlsx)')).toBe(
      "Populated into the customer's own file structure",
    );
  });
});

describe('quotationDate', () => {
  it('dates the quotation by the day it was approved', () => {
    // Noon rather than midnight, so the date cannot slip to a neighbouring day
    // in whatever time zone the tests run in.
    expect(quotationDate('2026-09-25T12:00:00Z')).toBe('25 Sep 2026');
  });

  it('writes September the same way in every browser', () => {
    // `en-GB` gives `Sept` in newer ICU; the document must not depend on the browser.
    expect(quotationDate('2026-09-11T12:00:00Z')).not.toContain('Sept');
  });

  it('leaves the date out rather than printing Invalid Date', () => {
    expect(quotationDate('')).toBe('');
    expect(quotationDate('not a date')).toBe('');
  });
});

describe('quotationTerms', () => {
  it('names the port the prices are delivered to', () => {
    expect(quotationTerms('Singapore')).toBe(
      'Prices in USD, delivered Singapore. Validity 30 days. Values in this preview are the ' +
        'confirmed values from Product Matching, Supplier Sourcing and Pricing.',
    );
  });

  it('does not promise delivery to nowhere', () => {
    expect(quotationTerms('')).toMatch(/^Prices in USD\. Validity 30 days\./);
  });
});

describe('quotationFileName', () => {
  it('names the PDF after the RFQ, as the backend does', () => {
    expect(quotationFileName('RFQ-0042', 'SG standard', 'pdf')).toBe('RFQ-0042_quotation.pdf');
    expect(quotationFileName('RFQ-0042', 'UAE standard', 'pdf')).toBe('RFQ-0042_quotation.pdf');
  });

  it("names the two offices' workbooks apart", () => {
    expect(quotationFileName('RFQ-0042', 'SG standard', 'excel')).toBe(
      'RFQ-0042_quotation_sg.xlsm',
    );
    expect(quotationFileName('RFQ-0042', 'UAE standard', 'excel')).toBe(
      'RFQ-0042_quotation_uae.xlsm',
    );
  });

  it('names the customer file apart from both', () => {
    expect(quotationFileName('RFQ-0042', 'Customer file (.xlsx)', 'excel')).toBe(
      'RFQ-0042_customer_file.xlsx',
    );
  });

  it('keeps the name safe for any file system', () => {
    expect(quotationFileName('RFQ/00 42', 'SG standard', 'pdf')).toBe('RFQ0042_quotation.pdf');
    expect(quotationFileName('', 'SG standard', 'pdf')).toBe('quotation_quotation.pdf');
  });
});

describe('whyNotDownloadable', () => {
  it('asks for a format before either file', () => {
    expect(whyNotDownloadable(null, 'pdf')).toBe(PICK_FORMAT);
    expect(whyNotDownloadable(null, 'excel')).toBe(PICK_FORMAT);
  });

  it('offers both files for either office', () => {
    for (const format of ['SG standard', 'UAE standard'] as const) {
      expect(whyNotDownloadable(format, 'pdf')).toBeNull();
      expect(whyNotDownloadable(format, 'excel')).toBeNull();
    }
  });

  it("offers the customer's file as Excel and nothing else", () => {
    expect(whyNotDownloadable('Customer file (.xlsx)', 'excel')).toBeNull();
    expect(whyNotDownloadable('Customer file (.xlsx)', 'pdf')).toBe(
      'Customer file (.xlsx) is Excel only',
    );
  });
});
