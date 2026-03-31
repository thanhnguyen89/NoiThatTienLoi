/**
 * Wrap một async function, nếu DB không kết nối được thì trả về fallback.
 * Bắt PrismaClientInitializationError và PrismaClientKnownRequestError liên quan DB.
 */
export async function dbSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    // Prisma error có field errorCode hoặc code
    const code = (err as Record<string, unknown>)?.errorCode as string | undefined;
    const name = (err as Error)?.name ?? '';
    const msg = (err as Error)?.message ?? '';

    const isDbError =
      name === 'PrismaClientInitializationError' ||
      name === 'PrismaClientRustPanicError' ||
      code === 'P1000' || // Authentication failed
      code === 'P1001' || // Can't reach server
      code === 'P1002' || // Timeout
      code === 'P1003' || // Database not found
      msg.includes("Can't reach database") ||
      msg.includes('Authentication failed') ||
      msg.includes('connect ECONNREFUSED');

    if (isDbError) {
      console.warn('[DB]', name || 'Error', code || '', '-', msg.slice(0, 80));
      return fallback;
    }

    throw err;
  }
}
