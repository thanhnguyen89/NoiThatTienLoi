import { EcommerceToolPage } from '@/components/ecommerce-tools/EcommerceToolPage';
import { ECOMMERCE_SELECT_OPTIONS as ecommerceSelectOptions } from '@/lib/ecommerce-tools/core';

export default function DanhGiaSanPhamNhanhPage() {
  return (
    <EcommerceToolPage
      kind="review"
      title="Đánh Giá Sản Phẩm Nhanh"
      subtitle="Tạo bài review 300-500 từ có ưu điểm, nhược điểm, rating và kết luận nên mua."
      endpoint="/api/danh-gia-san-pham-nhanh/stream"
      fetchUrlEndpoint="/api/danh-gia-san-pham-nhanh/fetch-url"
      generateLabel="Tạo review nhanh"
      defaultValues={{
        productName: '',
        specs: '',
        pros: '',
        cons: '',
        useCase: '',
        persona: 'real_user',
        overallRating: 4,
        language: 'Vietnamese',
        modelId: 'gemini-flash',
        brandName: '',
        forbidden: '',
      }}
      fields={[
        { name: 'productName', label: 'Tên sản phẩm', type: 'text', placeholder: 'VD: Giường sắt hộp 1m6' },
        { name: 'persona', label: 'Persona', type: 'select', options: ecommerceSelectOptions.reviewPersonas },
        { name: 'overallRating', label: 'Rating', type: 'rating', min: 1, max: 5 },
        { name: 'useCase', label: 'Trường hợp dùng', type: 'text', placeholder: 'VD: phòng 12m2, gia đình 4 người' },
        { name: 'specs', label: 'Thông số / chất liệu', type: 'textarea', rows: 5, placeholder: 'Kích thước, vật liệu, tải trọng, bảo hành...' },
        { name: 'pros', label: 'Ưu điểm đã biết', type: 'textarea', rows: 3, placeholder: 'Bền, chắc, dễ lắp ráp...' },
        { name: 'cons', label: 'Nhược điểm đã biết', type: 'textarea', rows: 3, placeholder: 'Nặng, cần thêm đệm, màu sắc giới hạn...' },
        { name: 'language', label: 'Ngôn ngữ', type: 'language' },
        { name: 'modelId', label: 'AI model', type: 'model' },
        { name: 'brandName', label: 'Thương hiệu', type: 'text', placeholder: 'VD: Nội Thất Minh Quân' },
        { name: 'forbidden', label: 'Từ không dùng', type: 'textarea', rows: 3, placeholder: 'Cách nhau bằng dấu phẩy' },
      ]}
    />
  );
}
