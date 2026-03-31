import { z } from 'zod';

export const sliderSchema = z.object({
  title: z.string().optional().nullable(),
  image: z.string().min(1, 'Hình ảnh là bắt buộc'),
  link: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type SliderInput = z.infer<typeof sliderSchema>;

export function validateSlider(data: unknown) {
  return sliderSchema.safeParse(data);
}
