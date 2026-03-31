'use client';

interface ConsultationFormProps {
  productId: string;
}

export function ConsultationForm({ productId }: ConsultationFormProps) {
  return (
    <div className="consultation-form" data-product-id={productId}>
      <h3>Tư vấn sản phẩm</h3>
      <p style={{ color: '#999', fontSize: 14 }}>Form tư vấn - sẽ phát triển sau</p>
    </div>
  );
}
