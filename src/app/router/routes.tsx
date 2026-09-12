import { createBrowserRouter, Navigate } from 'react-router';

import { AppLayout } from '@/app/AppLayout';
import { paths } from '@/app/router/paths';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { RfqDetailPage } from '@/pages/rfq-detail/RfqDetailPage';
import { RfqListPage } from '@/pages/rfq-list/RfqListPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to={paths.rfqList} replace /> },
      { path: paths.rfqList, element: <RfqListPage /> },
      { path: '/rfqs/:rfqId', element: <RfqDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
