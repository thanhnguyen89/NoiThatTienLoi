import { describe, it, expect } from 'vitest';
import { hasPermission, canUserDo, RESOURCES, ACTION_LABELS } from '../permissions';

describe('Permissions Utilities', () => {
  const makePerm = (resource: string, action: string) => ({ action, resource });

  describe('hasPermission', () => {
    it('returns true when user has the permission', () => {
      const perms = [makePerm('categories', 'VIEW'), makePerm('categories', 'CREATE')];
      const result = hasPermission(false, perms, 'VIEW', 'categories');
      expect(result).toBe(true);
    });

    it('returns false when user lacks the permission', () => {
      const perms = [makePerm('categories', 'VIEW'), makePerm('categories', 'CREATE')];
      const result = hasPermission(false, perms, 'DELETE', 'categories');
      expect(result).toBe(false);
    });

    it('returns false for empty permissions array', () => {
      const result = hasPermission(false, [], 'VIEW', 'categories');
      expect(result).toBe(false);
    });

    it('super admin bypasses all permissions', () => {
      const result = hasPermission(true, [], 'DELETE', 'products');
      expect(result).toBe(true);
    });

    it('handles all wildcard resource', () => {
      const perms = [makePerm('all', 'DELETE')];
      const result = hasPermission(false, perms, 'DELETE', 'products');
      expect(result).toBe(true);
    });

    it('is case-sensitive for action', () => {
      const perms = [makePerm('categories', 'view')];
      const result = hasPermission(false, perms, 'VIEW', 'categories');
      expect(result).toBe(false);
    });
  });

  describe('canUserDo', () => {
    it('returns true when user can perform action', () => {
      const perms = [makePerm('news', 'UPDATE')];
      const result = canUserDo(false, perms, 'UPDATE', 'news');
      expect(result).toBe(true);
    });

    it('returns false when user cannot perform action', () => {
      const perms = [makePerm('news', 'VIEW')];
      const result = canUserDo(false, perms, 'DELETE', 'news');
      expect(result).toBe(false);
    });

    it('delegates to hasPermission', () => {
      const perms = [makePerm('sliders', 'CREATE')];
      const result = canUserDo(false, perms, 'CREATE', 'sliders');
      expect(result).toBe(true);
    });
  });

  describe('RESOURCES', () => {
    it('contains expected resource keys', () => {
      expect(RESOURCES).toContain('categories');
      expect(RESOURCES).toContain('products');
      expect(RESOURCES).toContain('sliders');
      expect(RESOURCES).toContain('news');
      expect(RESOURCES).toContain('pages');
      expect(RESOURCES).toContain('users');
      expect(RESOURCES).toContain('roles');
    });
  });

  describe('ACTION_LABELS', () => {
    it('contains labels for all actions', () => {
      expect(ACTION_LABELS.VIEW).toBeTruthy();
      expect(ACTION_LABELS.CREATE).toBeTruthy();
      expect(ACTION_LABELS.UPDATE).toBeTruthy();
      expect(ACTION_LABELS.DELETE).toBeTruthy();
    });
  });
});
