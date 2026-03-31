import { describe, it, expect } from 'vitest';
import { validateLogin } from '../auth.validator';
import { validateAdminUser } from '../admin-user.validator';
import { validateAdminRole } from '../admin-role.validator';

describe('Login Validator', () => {
  it('validates correct credentials', () => {
    const data = { username: 'admin', password: 'Admin@123' };
    const result = validateLogin(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing username', () => {
    const data = { password: 'Admin@123' };
    const result = validateLogin(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing password', () => {
    const data = { username: 'admin' };
    const result = validateLogin(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty username', () => {
    const data = { username: '', password: 'Admin@123' };
    const result = validateLogin(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const data = { username: 'admin', password: '' };
    const result = validateLogin(data);
    expect(result.success).toBe(false);
  });

  it('accepts username with spaces (no trim in validator)', () => {
    // Login validator doesn't trim or reject spaces
    const data = { username: 'adm in', password: 'Admin@123' };
    const result = validateLogin(data);
    expect(result.success).toBe(true);
  });

  it('accepts short password (min 1 char in login)', () => {
    const data = { username: 'admin', password: '1' };
    const result = validateLogin(data);
    expect(result.success).toBe(true);
  });
});

describe('AdminUser Validator', () => {
  it('validates valid user data', () => {
    const data = {
      username: 'newuser',
      password: 'NewUser@123',
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      roleId: 'role-123',
      isActive: true,
    };
    const result = validateAdminUser(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing roleId', () => {
    const data = { username: 'newuser', password: 'NewUser@123', roleId: '' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('rejects username with special characters', () => {
    const data = { username: 'user@admin', password: 'Admin@123', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('rejects username shorter than 3 chars', () => {
    const data = { username: 'ab', password: 'Admin@123', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('rejects username longer than 100 chars', () => {
    const data = { username: 'a'.repeat(101), password: 'Admin@123', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const data = { username: 'newuser', password: 'Admin@123', email: 'notanemail', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('accepts valid email format', () => {
    const data = { username: 'newuser', password: 'Admin@123', email: 'user.name@example.co.uk', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const data = { username: 'newuser', password: '1234567', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const data = { username: 'newuser', password: '1234567', roleId: 'role-1' };
    const result = validateAdminUser(data);
    expect(result.success).toBe(false);
  });

  it('accepts optional fields as undefined', () => {
    const data = {
      username: 'newuser',
      password: 'Admin@123',
      email: 'test@test.com',
      roleId: 'role-1',
    };
    const result = validateAdminUser(data);
    expect(result.success).toBe(true);
  });

  it('accepts user data with all fields', () => {
    const data = {
      username: 'newuser',
      password: 'Admin@123',
      email: 'user@example.com',
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      roleId: 'role-1',
      isActive: false,
      isSuperAdmin: false,
    };
    const result = validateAdminUser(data);
    expect(result.success).toBe(true);
  });
});

describe('AdminRole Validator', () => {
  it('validates valid role data', () => {
    const data = {
      name: 'Editor',
      code: 'EDITOR',
      description: 'Can edit content',
      sortOrder: 10,
      isActive: true,
    };
    const result = validateAdminRole(data);
    expect(result.success).toBe(true);
  });

  it('accepts minimal data', () => {
    const data = { name: 'Editor', code: 'EDITOR' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(true);
  });

  it('rejects code with spaces', () => {
    const data = { name: 'Editor', code: 'E D I T O R' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(false);
  });

  it('rejects code with special characters', () => {
    const data = { name: 'Editor', code: 'EDITOR@' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    const data = { name: 'a'.repeat(101), code: 'LONGNAME' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 50 chars', () => {
    const data = { name: 'Editor', code: 'E'.repeat(51) };
    const result = validateAdminRole(data);
    expect(result.success).toBe(false);
  });

  it('accepts description', () => {
    const data = { name: 'Editor', code: 'EDITOR', description: 'Full access to content editing' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(true);
  });

  it('accepts isActive false', () => {
    const data = { name: 'Inactive Role', code: 'INACTIVE', isActive: false };
    const result = validateAdminRole(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it('applies default isActive to true', () => {
    const data = { name: 'Editor', code: 'EDITOR' };
    const result = validateAdminRole(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
