import { NextRequest } from 'next/server';
import { handleEcommerceFetchUrl } from '@/lib/ecommerce-tools/fetch-url-route';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  return handleEcommerceFetchUrl(request);
}
