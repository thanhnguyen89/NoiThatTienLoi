import { notFound } from 'next/navigation';
import { productSizeService } from '@/server/services/product-size.service';
import { DynamicProductSizeFormClient } from '@/admin/components/ProductSizeFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa kích thước' };

export default async function EditProductSizePage({ params }: Props) {
  const { id } = await params;
  let size = await productSizeService.getSizeById(id);
  if (!size) notFound();

  return (
    <DynamicProductSizeFormClient
      size={{
        id: size.id,
        sizeLabel: size.sizeLabel,
        widthCm: size.widthCm,
        lengthCm: size.lengthCm,
        heightCm: size.heightCm,
        sortOrder: size.sortOrder,
        isActive: size.isActive,
      }}
    />
  );
}
