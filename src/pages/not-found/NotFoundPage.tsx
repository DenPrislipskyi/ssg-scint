import { Link } from 'react-router';

import { paths } from '@/app/router/paths';

export const NotFoundPage = () => (
  <div className="mx-auto max-w-xl p-16 text-center">
    <h1 className="mb-2 text-2xl font-semibold">Page not found</h1>
    <Link to={paths.rfqList} className="text-sup underline">
      Back to RFQ list
    </Link>
  </div>
);
