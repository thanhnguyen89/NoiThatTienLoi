import { adminUserRepository } from '@/server/repositories/admin-user.repository';
import { adminSessionRepository } from '@/server/repositories/admin-session.repository';
import { adminActivityLogRepository } from '@/server/repositories/admin-activity-log.repository';
import { validateLogin } from '@/server/validators/auth.validator';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getTokenExpiry, type TokenPair } from '@/lib/auth/jwt';
import { NotFoundError, UnauthorizedError, ValidationError, ConflictError } from '@/server/errors';

export const authService = {
  async login(username: string, password: string, ip?: string, userAgent?: string): Promise<{
    user: { id: string; username: string; email: string; fullName: string | null; role: { name: string; code: string } };
    tokens: TokenPair;
  }> {
    const result = validateLogin({ username, password });
    if (!result.success) {
      throw new ValidationError('Dữ liệu không hợp lệ', result.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const user = await adminUserRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Tài khoản đã bị vô hiệu hóa');
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Tạo tokens
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleCode: user.role.code,
      isSuperAdmin: user.isSuperAdmin,
    });
    const refreshToken = signRefreshToken(user.id);

    // Lưu session
    const expiresAt = getTokenExpiry(refreshToken) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await adminSessionRepository.create({
      userId: user.id,
      token: accessToken,
      refreshToken,
      deviceInfo: userAgent || null,
      ipAddress: ip || null,
      expiresAt,
    });

    // Update last login
    await adminUserRepository.updateLastLogin(user.id, ip);

    // Log hoạt động
    await adminActivityLogRepository.create({
      userId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      description: 'Đăng nhập hệ thống',
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: { name: user.role.name, code: user.role.code },
      },
      tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
    };
  },

  async logout(accessToken: string, userId: string, ip?: string, userAgent?: string) {
    await adminSessionRepository.deleteByToken(accessToken);

    await adminActivityLogRepository.create({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      description: 'Đăng xuất hệ thống',
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  },

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const session = await adminSessionRepository.findByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedError('Session không tồn tại');
    }

    if (new Date() > session.expiresAt) {
      await adminSessionRepository.deleteByUserId(decoded.userId);
      throw new UnauthorizedError('Session đã hết hạn, vui lòng đăng nhập lại');
    }

    const user = await adminUserRepository.findByIdForToken(decoded.userId);
    if (!user) throw new UnauthorizedError('Không tìm thấy người dùng');

    const newAccessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleCode: user.role.code,
      isSuperAdmin: user.isSuperAdmin,
    });
    const newRefreshToken = signRefreshToken(user.id);
    const expiresAt = getTokenExpiry(newRefreshToken) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await adminSessionRepository.create({
      userId: user.id,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 15 * 60 };
  },

  async getMe(userId: string) {
    const user = await adminUserRepository.findById(userId);
    if (!user) throw new NotFoundError('Không tìm thấy người dùng');
    return user;
  },
};
