'use client';

import { useState } from 'react';
import { ProductTable } from './ProductTable';
import { TopSellingProducts } from './TopSellingProducts';
import type { ProductListItem } from '@/lib/types';

interface ProductListTabsProps {
  products: ProductListItem[];
  onTabChange?: (tab: 'list' | 'top-selling') => void;
}

export function ProductListTabs({ products, onTabChange }: ProductListTabsProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'top-selling'>('list');

  const handleTabChange = (tab: 'list' | 'top-selling') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3" style={{ borderBottom: '2px solid #dee2e6' }}>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => handleTabChange('list')}
            style={{
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              fontWeight: activeTab === 'list' ? 600 : 400,
              color: activeTab === 'list' ? '#0d6efd' : '#6c757d',
              borderBottom: activeTab === 'list' ? '3px solid #0d6efd' : 'none',
              paddingBottom: '10px',
            }}
          >
            <i className="bi bi-list-ul me-2"></i>
            Danh sách sản phẩm
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'top-selling' ? 'active' : ''}`}
            onClick={() => handleTabChange('top-selling')}
            style={{
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              fontWeight: activeTab === 'top-selling' ? 600 : 400,
              color: activeTab === 'top-selling' ? '#0d6efd' : '#6c757d',
              borderBottom: activeTab === 'top-selling' ? '3px solid #0d6efd' : 'none',
              paddingBottom: '10px',
            }}
          >
            <i className="bi bi-fire me-2"></i>
            Sản phẩm bán chạy nhất (Top 10)
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'list' && (
          <div className="tab-pane fade show active">
            <ProductTable products={products} />
          </div>
        )}

        {activeTab === 'top-selling' && (
          <div className="tab-pane fade show active">
            <TopSellingProducts limit={10} />
          </div>
        )}
      </div>
    </div>
  );
}

// Export activeTab state cho parent component
export { type ProductListTabsProps };
