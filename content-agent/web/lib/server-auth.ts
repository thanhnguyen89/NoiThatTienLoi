/**
 * Server-side authentication helpers
 * Dùng cho API routes và Server Components
 */

import { cookies } from 'next/headers';
import { verifyAccessToken, type JwtPayload } from './auth';

/**
 * Get current user from cookie
 * Dùng trong API routes và Server Components
 */
export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;
    
    if (!token) {
      return null;
    }

    const payload = verifyAccessToken(token);
    return payload;
  } catch (error) {
    console.error('[getCurrentUser] Error:', error);
    return null;
  }
}

/**
 * Require authentication - throw error if not authenticated
 * Dùng trong API routes
 */
export async function requireAuth(): Promise<JwtPayload> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
