import { ComingSoonToolPage } from '@/components/quick-tools/ComingSoonToolPage';

export default function DuDoanTranDauPage() {
  return (
    <ComingSoonToolPage
      title="Du Doan Tran Dau"
      description="Route placeholder duoc them de khong con dead link tu home. Tool nay chua co backend/domain logic trong repo."
      fallbackHref="/viet-bai-thong-minh"
      fallbackLabel="Mo viet bai thong minh"
    />
  );
}
