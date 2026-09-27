import { useMutation } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import {
  isCustomerLayout,
  quotationFileName,
  type QuotationFile,
  type QuotationFormat,
} from '@/entities/rfq/lib/quotation';
import type { RfqId } from '@/entities/rfq/model/types';
import { saveFile } from '@/shared/lib/saveFile';

export interface QuotationDownload {
  format: QuotationFormat;
  file: QuotationFile;
}

/**
 * Fetch one of this RFQ's quotation files and save it.
 *
 * A mutation rather than a query: nothing is cached, and each click is its
 * own download - the person asked for a file, not for a value to keep.
 */
export const useDownloadQuotation = (id: RfqId, reference: string) => {
  const { rfqs } = useRepositories();

  return useMutation({
    mutationFn: ({ format, file }: QuotationDownload) => {
      if (file === 'pdf') return rfqs.quotationPdf(id, format);
      return isCustomerLayout(format) ? rfqs.customerFile(id) : rfqs.quoteWorkbook(id, format);
    },
    onSuccess: (blob, { format, file }) =>
      saveFile(blob, quotationFileName(reference, format, file)),
  });
};
