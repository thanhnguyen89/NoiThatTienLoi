import BulkArticleViewPage from '@/components/viet-hang-loat/BulkArticleViewPage';

export default function Page({ params }: { params: { id: string } }) {
  return <BulkArticleViewPage featureId="dan-bai" articleId={params.id} />;
}
