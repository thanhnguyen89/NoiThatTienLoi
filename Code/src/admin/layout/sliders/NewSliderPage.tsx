import { DynamicSliderFormClient } from '@/admin/components/SliderFormWrapper';

export const metadata = { title: 'Thêm slider mới' };

export default async function NewSliderPage() {
  return <DynamicSliderFormClient />;
}
