import { useSuspenseQuery } from '@tanstack/react-query';

import { useRepositories } from '@/app/providers/RepositoriesProvider';
import { rfqKeys } from '@/entities/rfq/api/queryKeys';
import type { RfqDetail, RfqId } from '@/entities/rfq/model/types';

export const useRfq = (id: RfqId): RfqDetail => {
  const { rfqs } = useRepositories();
  const { data } = useSuspenseQuery({
    queryKey: rfqKeys.detail(id),
    queryFn: () => rfqs.getById(id),
  });
  return data;
};
