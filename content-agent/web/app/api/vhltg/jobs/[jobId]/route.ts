import { getBulkJob, patchBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';

export const GET = (_request: Request, { params }: { params: { jobId: string } }) =>
  getBulkJob('tinh-gon', params.jobId);

export const PATCH = (request: Request, { params }: { params: { jobId: string } }) =>
  patchBulkJob('tinh-gon', params.jobId, request as never);
