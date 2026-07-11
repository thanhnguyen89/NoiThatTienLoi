import { EcommerceToolPage } from '@/components/ecommerce-tools/EcommerceToolPage';
import { ECOMMERCE_SELECT_OPTIONS as ecommerceSelectOptions } from '@/lib/ecommerce-tools/core';

export default function GioiThieuSanPhamPage() {
  return (
    <EcommerceToolPage
      kind="description"
      title="Giới Thiệu Sản Phẩm"
      subtitle="Viết mô tả sản phẩm ecommerce theo độ dài, format và tone tùy chọn."
      endpoint="/api/gioi-thieu-san-pham/stream"
      fetchUrlEndpoint="/api/gioi-thieu-san-pham/fetch-url"
      generateLabel="Tạo giới thiệu"
      defaultValues={{
        productName: '',
        specs: '',
        keyBenefits: '',
        targetCustomer: '',
        length: 'standard',
        format: 'prose',
        tone: 'friendly',
        language: 'Vietnamese',
        modelId: 'gemini-flash',
        brandName: '',
        forbidden: '',
      }}
      fields={[
        { name: 'productName', label: 'Tên sản phẩm', type: 'text', placeholder: 'VD: Giường sắt hộp 1m6' },
        { name: 'length', label: 'Độ dài', type: 'select', options: ecommerceSelectOptions.descriptionLengths },
        { name: 'format', label: 'Format', type: 'select', options: ecommerceSelectOptions.descriptionFormats },
        { name: 'tone', label: 'Giọng văn', type: 'select', options: [
          { value: 'friendly', label: 'Thân thiện' },
          { value: 'professional', label: 'Chuyên nghiệp' },
          { value: 'persuasive', label: 'Thuyết phục' },
          { value: 'casual', label: 'Thoải mái' },
        ] },
        { name: 'specs', label: 'Thông số / chất liệu', type: 'textarea', rows: 5, placeholder: 'Kích thước, vật liệu, tải trọng, bảo hành...' },
        { name: 'keyBenefits', label: 'Lợi ích / điểm bán', type: 'textarea', rows: 4, placeholder: 'Giải quyết vấn đề gì, điểm khác biệt...' },
        { name: 'targetCustomer', label: 'Khách hàng mục tiêu', type: 'text', placeholder: 'VD: phòng trọ, gia đình, văn phòng' },
        { name: 'language', label: 'Ngôn ngữ', type: 'language' },
        { name: 'modelId', label: 'AI model', type: 'model' },
        { name: 'brandName', label: 'Thương hiệu', type: 'text', placeholder: 'VD: Nội Thất Minh Quân' },
        { name: 'forbidden', label: 'Từ không dùng', type: 'textarea', rows: 3, placeholder: 'Cách nhau bằng dấu phẩy' },
      ]}
    />
  );
}
