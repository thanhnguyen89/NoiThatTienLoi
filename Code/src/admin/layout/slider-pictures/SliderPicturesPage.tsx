export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Suspense } from 'react';
import { sliderPictureService } from '@/server/services/slider-picture.service';
import { SliderPictureTable } from '@/admin/features/slider-picture/SliderPictureTable';
import { SliderPictureFilters } from '@/admin/features/slider-picture/SliderPictureFilters';

interface Props {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export const metadata = { title: 'Quản lý hình ảnh Slider' };

export default async function SliderPicturesPage({ searchParams }: Props) {
  const sp = await searchParams;
  let pictures: Awaited<ReturnType<typeof sliderPictureService.getAllSliderPictures>> = [];
  let dbError = false;

  try {
    pictures = await sliderPictureService.getAllSliderPictures();

    if (sp.search) {
      const kw = sp.search.toLowerCase();
      pictures = pictures.filter((p) =>
        (p.name && p.name.toLowerCase().includes(kw)) ||
        (p.comment && p.comment.toLowerCase().includes(kw))
      );
    }
    if (sp.status === 'active') {
      pictures = pictures.filter((p) => p.isActive);
    } else if (sp.status === 'inactive') {
      pictures = pictures.filter((p) => !p.isActive);
    }
  } catch { dbError = true; }

  return (
    <>
      <div className="card mb-3">
        <div className="card-header-custom">
          THÔNG TIN TÌM KIẾM
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
            <i className="bi bi-x-lg"></i>
          </div>
        </div>
        <div className="card-body py-3 px-3">
          <Suspense fallback={null}>
            <SliderPictureFilters
              defaultSearch={sp.search || ''}
              defaultStatus={sp.status || ''}
            />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <div className="card-header-custom">
          DANH SÁCH HÌNH ẢNH SLIDER
          <div className="header-icons">
            <i className="bi bi-dash-lg"></i>
            <i className="bi bi-fullscreen"></i>
          </div>
        </div>
        <div className="card-body p-2">
          <div className="mb-2">
            <Link href="/admin/slider-pictures/new" className="btn-add">
              <i className="bi bi-plus-lg me-1"></i>Thêm mới
            </Link>
          </div>

          {dbError && (
            <div className="alert alert-danger mb-2 py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Không thể kết nối database. Vui lòng kiểm tra PostgreSQL.
            </div>
          )}

          <SliderPictureTable pictures={pictures} />
        </div>
      </div>
    </>
  );
}
