import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { id: string } }) {
  redirect(`/viet-hang-loat-thong-minh/${params.id}`);
}
