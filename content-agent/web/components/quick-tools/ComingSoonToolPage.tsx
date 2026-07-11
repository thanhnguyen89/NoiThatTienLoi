import Link from 'next/link';

interface ComingSoonToolPageProps {
  title: string;
  description: string;
  fallbackHref: string;
  fallbackLabel: string;
}

export function ComingSoonToolPage({
  title,
  description,
  fallbackHref,
  fallbackLabel,
}: ComingSoonToolPageProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Quick Tool</p>
          <h1 className="text-3xl font-black text-gray-900">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">{description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Trang nay da co route</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Flow day du cho tool nay chua duoc build xong trong repo hien tai, nhung route da duoc dat san de tranh link chet.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Huong di tam thoi</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Neu can xu ly ngay, dung cong cu gan nhat duoi day roi tinh chinh output trong editor/generate page.
            </p>
            <Link
              href={fallbackHref}
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {fallbackLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
