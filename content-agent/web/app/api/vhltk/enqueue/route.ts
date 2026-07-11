import { enqueueBulkJob } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

export const POST = (request: Request) => enqueueBulkJob('tu-khoa', request as never);
