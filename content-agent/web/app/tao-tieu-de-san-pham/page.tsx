import { EcommerceToolPage } from '@/components/ecommerce-tools/EcommerceToolPage';
import { ECOMMERCE_SELECT_OPTIONS as ecommerceSelectOptions } from '@/lib/ecommerce-tools/core';

export default function TaoTieuDeSanPhamPage() {
  return (
    <EcommerceToolPage
      kind="meta"
      title="Tạo Tiêu Đề Sản Phẩm"
      subtitle="Tạo 5 meta title, 1 meta description và SERP preview cho trang sản phẩm."
      endpoint="/api/tao-tieu-de-san-pham/generate"
      fetchUrlEndpoint="/api/tao-tieu-de-san-pham/fetch-url"
      generateLabel="Tạo meta title"
      defaultValues={{
        productName: '',
        productFeatures: '',
        tone: 'seo_focus',
        language: 'Vietnamese',
        modelId: 'gemini-flash',
        brandName: '',
        forbidden: '',
      }}
      fields={[
        { name: 'productName', label: 'Tên sản phẩm', type: 'text', placeholder: 'VD: Giường sắt hộp 1m6' },
        { name: 'tone', label: 'Phong cách', type: 'select', options: ecommerceSelectOptions.productTones },
        { name: 'productFeatures', label: 'Mô tả / tính năng', type: 'textarea', rows: 6, placeholder: 'Chất liệu, kích thước, lợi ích, giá, bảo hành...' },
        { name: 'language', label: 'Ngôn ngữ', type: 'language' },
        { name: 'modelId', label: 'AI model', type: 'model' },
        { name: 'brandName', label: 'Thương hiệu', type: 'text', placeholder: 'VD: Nội Thất Minh Quân' },
        { name: 'forbidden', label: 'Từ không dùng', type: 'textarea', rows: 3, placeholder: 'Cách nhau bằng dấu phẩy' },
      ]}
    />
  );
}
