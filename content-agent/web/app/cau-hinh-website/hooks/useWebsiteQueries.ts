import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WebsiteConfig } from '../types';
import { WebsiteConfigInput, BulkAction, ExportConfig, ImportConfig } from '../schemas';
import toast from 'react-hot-toast';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const websiteKeys = {
  all: ['websites'] as const,
  lists: () => [...websiteKeys.all, 'list'] as const,
  list: (filters: string) => [...websiteKeys.lists(), filters] as const,
  details: () => [...websiteKeys.all, 'detail'] as const,
  detail: (id: string) => [...websiteKeys.details(), id] as const,
};

// ─── Fetch Functions ──────────────────────────────────────────────────────────

async function fetchWebsites(params?: URLSearchParams): Promise<WebsiteConfig[]> {
  const url = params ? `/api/websites?${params.toString()}` : '/api/websites';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch websites');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch websites');
  return json.data;
}

async function createWebsite(data: WebsiteConfigInput): Promise<WebsiteConfig> {
  const res = await fetch('/api/websites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create website');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to create website');
  return json.data;
}

async function updateWebsite(data: WebsiteConfigInput & { id: string }): Promise<WebsiteConfig> {
  const res = await fetch('/api/websites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update website');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update website');
  return json.data;
}

async function deleteWebsite(id: string): Promise<void> {
  const res = await fetch(`/api/websites?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete website');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete website');
}

async function bulkAction(action: BulkAction): Promise<void> {
  const res = await fetch('/api/websites/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error('Failed to perform bulk action');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to perform bulk action');
}

async function exportConfigs(config: ExportConfig): Promise<Blob> {
  const res = await fetch('/api/websites/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to export configs');
  return res.blob();
}

async function importConfigs(config: ImportConfig): Promise<{ imported: number; skipped: number }> {
  const res = await fetch('/api/websites/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to import configs');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to import configs');
  return json.data;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWebsites(params?: URLSearchParams) {
  return useQuery({
    queryKey: websiteKeys.list(params?.toString() || ''),
    queryFn: () => fetchWebsites(params),
  });
}

export function useCreateWebsite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.lists() });
      toast.success('Đã thêm website');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi thêm website');
    },
  });
}

export function useUpdateWebsite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.lists() });
      toast.success('Đã cập nhật website');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi cập nhật website');
    },
  });
}

export function useDeleteWebsite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWebsite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.lists() });
      toast.success('Đã xóa website');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi xóa website');
    },
  });
}

export function useBulkAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkAction,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.lists() });
      const actionLabels = {
        delete: 'Đã xóa',
        activate: 'Đã kích hoạt',
        deactivate: 'Đã tắt',
        export: 'Đã xuất',
      };
      toast.success(`${actionLabels[variables.action]} ${variables.ids.length} website`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi thực hiện hành động');
    },
  });
}

export function useExportConfigs() {
  return useMutation({
    mutationFn: exportConfigs,
    onSuccess: (blob, variables) => {
      // Download file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `website-configs-${new Date().toISOString().split('T')[0]}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Đã xuất cấu hình');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi xuất cấu hình');
    },
  });
}

export function useImportConfigs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importConfigs,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: websiteKeys.lists() });
      toast.success(`Đã nhập ${data.imported} website${data.skipped > 0 ? `, bỏ qua ${data.skipped}` : ''}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Lỗi khi nhập cấu hình');
    },
  });
}
