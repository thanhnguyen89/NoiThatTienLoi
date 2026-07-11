import { EcommerceToolPage } from '@/components/ecommerce-tools/EcommerceToolPage';
import { ECOMMERCE_SELECT_OPTIONS as ecommerceSelectOptions } from '@/lib/ecommerce-tools/core';

export default function FaqSanPhamPage() {
  return (
    <EcommerceToolPage
      kind="faq"
      title="FAQ Sản Phẩm"
      subtitle="Tạo 5-10 câu hỏi thường gặp và JSON-LD FAQ Schema cho trang sản phẩm."
      endpoint="/api/faq-san-pham/generate"
      fetchUrlEndpoint="/api/faq-san-pham/fetch-url"
      generateLabel="Tạo FAQ"
      defaultValues={{
        productName: '',
        specs: '',
        useCase: '',
        commonConcerns: '',
        faqTypes: ['general', 'technical', 'purchase'],
        count: 7,
        includeSchema: true,
        language: 'Vietnamese',
        modelId: 'gemini-flash',
        brandName: '',
        shopPhone: '',
        shopAddress: '',
      }}
      fields={[
        { name: 'productName', label: 'Tên sản phẩm', type: 'text', placeholder: 'VD: Giường sắt hộp 1m6' },
        { name: 'count', label: 'Số câu hỏi', type: 'select', options: ecommerceSelectOptions.faqCounts },
        { name: 'faqTypes', label: 'Loại FAQ', type: 'checkboxes', options: ecommerceSelectOptions.faqTypes },
        { name: 'includeSchema', label: 'Tạo JSON-LD FAQ Schema', type: 'switch', placeholder: 'Bật nếu cần copy schema để gắn vào trang sản phẩm.' },
        { name: 'specs', label: 'Thông số / chất liệu', type: 'textarea', rows: 5, placeholder: 'Kích thước, vật liệu, tải trọng, bảo hành...' },
        { name: 'useCase', label: 'Bối cảnh dùng', type: 'textarea', rows: 3, placeholder: 'Dùng trong phòng nào, cho đối tượng nào...' },
        { name: 'commonConcerns', label: 'Khách hay băn khoăn', type: 'textarea', rows: 3, placeholder: 'Giao hàng, bảo hành, lắp ráp, độ bền...' },
        { name: 'language', label: 'Ngôn ngữ', type: 'language' },
        { name: 'modelId', label: 'AI model', type: 'model' },
        { name: 'brandName', label: 'Thương hiệu', type: 'text', placeholder: 'VD: Nội Thất Minh Quân' },
        { name: 'shopPhone', label: 'Hotline', type: 'text', placeholder: 'VD: 090...' },
        { name: 'shopAddress', label: 'Địa chỉ', type: 'text', placeholder: 'VD: TP.HCM' },
      ]}
    />
  );
}
