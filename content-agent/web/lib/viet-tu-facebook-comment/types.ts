import type { BrandSectionState } from '@/components/BrandSection';
import type { CommentCount as SharedCommentCount } from '@/lib/facebook-comment/options';

export type CommentCount = SharedCommentCount;

export type CommentBrandStyle =
  | 'funny'
  | 'shorten'
  | 'creative'
  | 'friendly'
  | 'casual'
  | 'professional'
  | 'curious'
  | 'experience'
  | 'tag_friend';

export interface CommentBrandConfig {
  postContent: string;
  facebookPostId: string | null;
  language: string;
  style: CommentBrandStyle;
  count: CommentCount;
  modelId: string;
  brand: BrandSectionState;
  notes?: string;
}

export interface CommentBrandBatchEvent {
  type: 'batch';
  comments: string[];
  batchIndex: number;
  totalBatch: number;
}

export interface CommentBrandDoneEvent {
  type: 'done';
  total: number;
}

export interface CommentBrandErrorEvent {
  type: 'error';
  message: string;
}

export type CommentBrandSSEEvent =
  | CommentBrandBatchEvent
  | CommentBrandDoneEvent
  | CommentBrandErrorEvent;

export interface CommentBrandCard {
  id: string;
  text: string;
  copied: boolean;
  saved: boolean;
}

export interface SaveCommentResponse {
  id: string;
  savedCount: number;
}

export interface FacebookCommentBrandItem {
  id: string;
  createdAt: string;
  postContent: string;
  style: string;
  count: number;
  comments: string[];
  notes: string | null;
}

export interface SavedFacebookPostOption {
  id: string;
  keyword: string;
  content: string;
  contentPreview?: string;
  shopName: string | null;
  createdAt: string;
}
