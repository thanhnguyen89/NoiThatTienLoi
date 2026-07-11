import { getBulkJob, patchBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';

export const GET = (_request: Request, { params }: { params: { jobId: string } }) =>
  getBulkJob('theo-nguon', params.jobId);

export const PATCH = (request: Request, { params }: { params: { jobId: string } }) =>
  patchBulkJob('theo-nguon', params.jobId, request as never);
