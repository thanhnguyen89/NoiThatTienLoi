'use client';

import { useState } from 'react';

interface OrderExportButtonProps {
  filters?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    customerType?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

export function OrderExportButton({ filters = {} }: OrderExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
      if (filters.customerType) params.set('customerType', filters.customerType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
      if (filters.priceMax) params.set('priceMax', String(filters.priceMax));

      const url = `/admin/api/orders/export?${params.toString()}`;

      // Fetch file
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Lỗi khi xuất file');
        return;
      }

      // Download file
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      alert('Xuất file Excel thành công!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Lỗi khi xuất file');
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-sm btn-success"
      onClick={handleExport}
      disabled={exporting}
      title="Xuất danh sách đơn hàng ra Excel"
    >
      {exporting ? (
        <>
          <span className="spinner-border spinner-border-sm me-1"></span>
          Đang xuất...
        </>
      ) : (
        <>
          <i className="bi bi-file-earmark-excel me-1"></i>
          Xuất Excel
        </>
      )}
    </button>
  );
}
