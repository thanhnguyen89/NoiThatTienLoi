import { describe, it, expect } from 'vitest';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '../jwt';

describe('JWT Utilities', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('signs and verifies a valid token', () => {
      const payload = { userId: 'user-123', username: 'admin', roleId: 'role-123', roleCode: 'ADMIN', isSuperAdmin: false };
      const token = signAccessToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      if (decoded) {
        expect(decoded.userId).toBe('user-123');
        expect(decoded.username).toBe('admin');
        expect(decoded.roleCode).toBe('ADMIN');
      }
    });

    it('returns null for invalid token', () => {
      const decoded = verifyAccessToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('returns null for empty token', () => {
      const decoded = verifyAccessToken('');
      expect(decoded).toBeNull();
    });

    it('returns null for malformed token', () => {
      const decoded = verifyAccessToken('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('signs and verifies a valid refresh token', () => {
      const userId = 'user-123';
      const token = signRefreshToken(userId);
      expect(token).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      if (decoded) {
        expect(decoded.userId).toBe('user-123');
      }
    });

    it('returns null for invalid refresh token', () => {
      const decoded = verifyRefreshToken('invalid.refresh.token');
      expect(decoded).toBeNull();
    });

    it('returns null for malformed refresh token', () => {
      const decoded = verifyRefreshToken('not-a-jwt');
      expect(decoded).toBeNull();
    });
  });
});
