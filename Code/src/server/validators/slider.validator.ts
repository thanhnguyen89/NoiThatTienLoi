import { z } from 'zod';

const sliderImageSchema = z.object({
  url: z.string().min(1),
  title: z.string(),
});

export const sliderSchema = z.object({
  title: z.string().optional().nullable(),
  // Support both legacy single-image string and new JSON array format
  image: z.string().min(1, 'Hình ảnh là bắt buộc').refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.every((item) => sliderImageSchema.safeParse(item).success);
        }
        return false;
      } catch {
        return false;
      }
    },
    { message: 'Định dạng hình ảnh không hợp lệ' }
  ),
  link: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type SliderInput = z.infer<typeof sliderSchema>;

export function validateSlider(data: unknown) {
  return sliderSchema.safeParse(data);
}
