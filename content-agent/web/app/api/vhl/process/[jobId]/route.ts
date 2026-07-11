import { processBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = (_request: Request, { params }: { params: { jobId: string } }) =>
  processBulkJob('smart', params.jobId);
