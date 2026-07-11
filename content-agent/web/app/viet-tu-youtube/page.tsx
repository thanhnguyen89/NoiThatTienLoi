import { ComingSoonToolPage } from '@/components/quick-tools/ComingSoonToolPage';

export default function VietTuYoutubePage() {
  return (
    <ComingSoonToolPage
      title="Viet Tu Youtube Video"
      description="Route nay duoc them de home/menu khong con link chet. Phan transcript + crawl video chua nam trong repo web hien tai."
      fallbackHref="/viet-theo-nguon"
      fallbackLabel="Mo viet theo nguon"
    />
  );
}
