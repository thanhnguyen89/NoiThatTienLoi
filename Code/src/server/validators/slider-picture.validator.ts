import { z } from 'zod';

export const sliderPictureSchema = z.object({
  comment: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional().nullable(),
  name: z.string().max(1000, 'Tên tối đa 1000 ký tự').optional().nullable(),
  image: z.string().max(4000, 'Đường dẫn ảnh tối đa 4000 ký tự').optional().nullable(),
  sortOrder: z.coerce.number().int().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type SliderPictureInput = z.infer<typeof sliderPictureSchema>;

export function validateSliderPicture(data: unknown) {
  return sliderPictureSchema.safeParse(data);
}
