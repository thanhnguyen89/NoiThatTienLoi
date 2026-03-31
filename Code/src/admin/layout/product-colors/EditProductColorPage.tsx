import { notFound } from 'next/navigation';
import { productColorService } from '@/server/services/product-color.service';
import { DynamicProductColorFormClient } from '@/admin/components/ProductColorFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa màu sắc' };

export default async function EditProductColorPage({ params }: Props) {
  const { id } = await params;
  let color = await productColorService.getColorById(id);
  if (!color) notFound();

  return (
    <DynamicProductColorFormClient
      color={{
        id: color.id,
        colorName: color.colorName,
        colorCode: color.colorCode,
        sortOrder: color.sortOrder,
        isActive: color.isActive,
      }}
    />
  );
}
