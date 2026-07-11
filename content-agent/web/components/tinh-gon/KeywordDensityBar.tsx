'use client';

interface Props {
  density: number | null;
  target?: [number, number];
}

export function KeywordDensityBar({ density, target = [1.0, 1.5] }: Props) {
  if (density === null) return null;

  const [min, max] = target;
  const inRange = density >= min && density <= max;
  const status = inRange ? 'ok' : density < min ? 'low' : 'high';

  return (
    <div className="rounded-xl border border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Mật độ từ khóa</span>
        <span className={`text-sm font-bold ${status === 'ok' ? 'text-green-600' : 'text-orange-500'}`}>
          {density}%
        </span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${status === 'ok' ? 'bg-green-500' : 'bg-orange-400'}`}
          style={{ width: `${Math.min((density / 3) * 100, 100)}%` }}
        />
      </div>

      <p className="text-xs text-gray-400">
        Mục tiêu: {min}–{max}% ·{' '}
        {status === 'low' ? 'Cần thêm từ khóa' : status === 'high' ? 'Đang hơi dày' : 'Đạt chuẩn'}
      </p>
    </div>
  );
}
