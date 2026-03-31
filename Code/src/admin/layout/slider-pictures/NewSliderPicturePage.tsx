export const dynamic = 'force-dynamic';
import { DynamicSliderPictureFormClient } from '@/admin/components/SliderPictureFormWrapper';

export const metadata = { title: 'Thêm hình ảnh slider mới' };

export default async function NewSliderPicturePage() {
  return <DynamicSliderPictureFormClient />;
}
