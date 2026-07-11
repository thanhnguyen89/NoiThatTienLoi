import { crawlTheoNguon } from '@/lib/viet-hang-loat/api';

export const runtime = 'nodejs';
export const maxDuration = 120;

export const POST = (request: Request) => crawlTheoNguon(request as never);
