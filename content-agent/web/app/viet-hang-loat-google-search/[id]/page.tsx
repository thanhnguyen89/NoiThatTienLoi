import BulkArticleViewPage from '@/components/viet-hang-loat/BulkArticleViewPage';

export default function Page({ params }: { params: { id: string } }) {
  return <BulkArticleViewPage featureId="google-search" articleId={params.id} />;
}
