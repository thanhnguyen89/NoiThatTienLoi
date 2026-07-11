import type { BrandSectionState } from '@/components/BrandSection';

export type VideoType =
  | 'product_demo'
  | 'load_test'
  | 'price_reveal'
  | 'new_arrival'
  | 'promotion';

export type HookStyle =
  | 'pov'
  | 'challenge'
  | 'number'
  | 'question'
  | 'story';

export type TikTokCTA =
  | 'inbox'
  | 'comment_key'
  | 'bio_link'
  | 'phone';

export type EmojiLevel = 'none' | 'low' | 'medium' | 'high';

export interface TiktokBrandPostConfig {
  topic: string;
  videoType: VideoType;
  hookStyle: HookStyle;
  ctaStyle: TikTokCTA;
  language: string;
  emojiLevel: EmojiLevel;
  modelId: string;
  brand: BrandSectionState;
}

export interface TiktokParsedOutput {
  title: string;
  caption: string;
  hashtags: string[];
}

export type TiktokPostSSEEvent =
  | { type: 'chunk'; text: string }
  | { type: 'parsed'; data: TiktokParsedOutput }
  | { type: 'done'; wordCount: number; charCount: number }
  | { type: 'error'; message: string };

export interface SavedTiktokPost {
  id: string;
  topic: string;
  title: string | null;
  content: string;
  hashtags: string | null;
  videoType: VideoType;
  hookStyle: HookStyle;
  ctaStyle: TikTokCTA;
  emojiLevel: EmojiLevel;
  brandName: string | null;
  wordCount: number | null;
  charCount: number | null;
  createdAt: string;
}
