import { notFound } from 'next/navigation';
import { sliderService } from '@/server/services/slider.service';
import { DynamicSliderFormClient } from '@/admin/components/SliderFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa slider' };

export default async function EditSliderPage({ params }: Props) {
  const { id } = await params;
  let slider = await sliderService.getSliderById(id);
  if (!slider) notFound();

  return (
    <DynamicSliderFormClient
      slider={{
        id: slider.id,
        title: slider.title,
        image: slider.image,
        link: slider.link,
        content: slider.content,
        sortOrder: slider.sortOrder,
        isActive: slider.isActive,
      }}
    />
  );
}
