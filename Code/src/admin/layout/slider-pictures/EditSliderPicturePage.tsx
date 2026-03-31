export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { sliderPictureService } from '@/server/services/slider-picture.service';
import { DynamicSliderPictureFormClient } from '@/admin/components/SliderPictureFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa hình ảnh slider' };

export default async function EditSliderPicturePage({ params }: Props) {
  const { id } = await params;
  let picture = await sliderPictureService.getSliderPictureById(id);
  if (!picture) notFound();

  return (
    <DynamicSliderPictureFormClient
      picture={{
        id: picture.id,
        comment: picture.comment,
        name: picture.name,
        image: picture.image,
        sortOrder: picture.sortOrder,
        isActive: picture.isActive,
      }}
    />
  );
}
