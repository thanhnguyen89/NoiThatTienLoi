import { getBulkJob, patchBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';

export const GET = (_request: Request, { params }: { params: { jobId: string } }) =>
  getBulkJob('smart', params.jobId);

export const PATCH = (request: Request, { params }: { params: { jobId: string } }) =>
  patchBulkJob('smart', params.jobId, request as never);
