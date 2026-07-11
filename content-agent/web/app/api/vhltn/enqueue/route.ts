import { enqueueBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = (request: Request) => enqueueBulkJob('theo-nguon', request as never);
