import { EcommerceToolPage } from '@/components/ecommerce-tools/EcommerceToolPage';
import { ECOMMERCE_SELECT_OPTIONS as ecommerceSelectOptions } from '@/lib/ecommerce-tools/core';

export default function TaoTenSanPhamPage() {
  return (
    <EcommerceToolPage
      kind="name"
      title="Tạo Tên Sản Phẩm"
      subtitle="Tạo 10 phương án tên sản phẩm kèm style và lý do để dùng cho listing ecommerce."
      endpoint="/api/tao-ten-san-pham/generate"
      fetchUrlEndpoint="/api/tao-ten-san-pham/fetch-url"
      generateLabel="Tạo tên sản phẩm"
      defaultValues={{
        productType: '',
        material: '',
        keyFeatures: '',
        targetCustomer: '',
        priceSegment: 'mid',
        language: 'Vietnamese',
        modelId: 'gemini-flash',
        brandName: '',
        forbidden: '',
      }}
      fields={[
        { name: 'productType', label: 'Loại sản phẩm', type: 'text', placeholder: 'VD: Giường sắt, tủ quần áo, bàn học' },
        { name: 'priceSegment', label: 'Phân khúc giá', type: 'select', options: ecommerceSelectOptions.priceSegments },
        { name: 'material', label: 'Chất liệu', type: 'text', placeholder: 'VD: sắt hộp 4x6, gỗ MDF, inox' },
        { name: 'targetCustomer', label: 'Khách hàng mục tiêu', type: 'text', placeholder: 'VD: sinh viên thuê trọ, gia đình HCM' },
        { name: 'keyFeatures', label: 'Tính năng nổi bật', type: 'textarea', rows: 5, placeholder: 'Gọn nhẹ, chịu lực, gấp gọn, có bánh xe...' },
        { name: 'language', label: 'Ngôn ngữ', type: 'language' },
        { name: 'modelId', label: 'AI model', type: 'model' },
        { name: 'brandName', label: 'Thương hiệu', type: 'text', placeholder: 'VD: Nội Thất Minh Quân' },
        { name: 'forbidden', label: 'Từ không dùng', type: 'textarea', rows: 3, placeholder: 'Cách nhau bằng dấu phẩy' },
      ]}
    />
  );
}
