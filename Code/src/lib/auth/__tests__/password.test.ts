import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('hashes a password', async () => {
      const password = 'Admin@123';
      const hash = await hashPassword(password);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('generates different hashes for same password', async () => {
      const password = 'Admin@123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const password = 'Admin@123';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const password = 'Admin@123';
      const hash = await hashPassword(password);
      const result = await verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });

    it('rejects empty password against hash', async () => {
      const hash = await hashPassword('Admin@123');
      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });
  });
});
