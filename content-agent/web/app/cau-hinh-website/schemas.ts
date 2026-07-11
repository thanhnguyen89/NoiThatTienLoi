import { z } from 'zod';

// ─── Website Config Schema ────────────────────────────────────────────────────

export const websiteConfigSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Tên website là bắt buộc').max(200, 'Tên quá dài (tối đa 200 ký tự)'),
  url: z.string().url('URL không hợp lệ').max(500, 'URL quá dài'),
  platform: z.enum(['wordpress', 'shopify', 'wix', 'custom', 'static'], {
    errorMap: () => ({ message: 'Nền tảng không hợp lệ' }),
  }),
  apiUrl: z.string().url('API URL không hợp lệ').max(500, 'API URL quá dài'),

  // Company info (optional)
  companyName: z.string().max(300, 'Tên công ty quá dài').optional().nullable(),
  hotline: z.string().max(100, 'Hotline quá dài').optional().nullable(),
  hotlineComplaint: z.string().max(100, 'Hotline khiếu nại quá dài').optional().nullable(),
  branchCount: z.number().int().positive('Số chi nhánh phải là số dương').optional().nullable(),
  branchListUrl: z.string().url('URL danh sách chi nhánh không hợp lệ').optional().or(z.literal('')).nullable(),
  supportInfo: z.string().max(1000, 'Thông tin hỗ trợ quá dài').optional().nullable(),

  // Auth (optional)
  username: z.string().max(200, 'Username quá dài').optional().nullable(),
  appPassword: z.string().max(500, 'Password quá dài').optional().nullable(),
  apiKey: z.string().max(500, 'API Key quá dài').optional().nullable(),
  apiSecret: z.string().max(500, 'API Secret quá dài').optional().nullable(),

  // Defaults
  defaultCategory: z.number().int().positive().optional().nullable(),
  defaultAuthorId: z.number().int().positive().optional().nullable(),
  defaultStatus: z.enum(['draft', 'publish', 'pending']).default('draft'),

  // Status
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),

  // ID for updates
  id: z.string().uuid().optional(),
});

// ─── Partial Schema for Updates ───────────────────────────────────────────────

export const websiteConfigUpdateSchema = websiteConfigSchema.partial().extend({
  id: z.string().uuid(),
});

// ─── Search/Filter Schema ─────────────────────────────────────────────────────

export const websiteSearchSchema = z.object({
  query: z.string().optional(),
  platform: z.enum(['all', 'wordpress', 'shopify', 'wix', 'custom', 'static']).default('all'),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  isDefault: z.boolean().optional(),
});

// ─── Pagination Schema ────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(10),
});

// ─── Bulk Action Schema ───────────────────────────────────────────────────────

export const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Chọn ít nhất 1 website'),
  action: z.enum(['delete', 'activate', 'deactivate', 'export']),
});

// ─── Export Schema ────────────────────────────────────────────────────────────

export const exportConfigSchema = z.object({
  ids: z.array(z.string().uuid()).optional(), // If empty, export all
  format: z.enum(['json', 'csv']).default('json'),
  includeSecrets: z.boolean().default(false), // Whether to include passwords/keys
});

// ─── Import Schema ────────────────────────────────────────────────────────────

export const importConfigSchema = z.object({
  data: z.array(websiteConfigSchema),
  overwrite: z.boolean().default(false), // Overwrite existing configs with same name
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type WebsiteConfigInput = z.infer<typeof websiteConfigSchema>;
export type WebsiteConfigUpdate = z.infer<typeof websiteConfigUpdateSchema>;
export type WebsiteSearch = z.infer<typeof websiteSearchSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type BulkAction = z.infer<typeof bulkActionSchema>;
export type ExportConfig = z.infer<typeof exportConfigSchema>;
export type ImportConfig = z.infer<typeof importConfigSchema>;

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function validateWebsiteConfig(data: unknown) {
  return websiteConfigSchema.safeParse(data);
}

export function validateWebsiteUpdate(data: unknown) {
  return websiteConfigUpdateSchema.safeParse(data);
}

export function validateSearch(data: unknown) {
  return websiteSearchSchema.safeParse(data);
}

export function validatePagination(data: unknown) {
  return paginationSchema.safeParse(data);
}

export function validateBulkAction(data: unknown) {
  return bulkActionSchema.safeParse(data);
}

export function validateExport(data: unknown) {
  return exportConfigSchema.safeParse(data);
}

export function validateImport(data: unknown) {
  return importConfigSchema.safeParse(data);
}
