export type CommentStyle =
  | 'funny'
  | 'shorten'
  | 'creative'
  | 'friendly'
  | 'casual'
  | 'professional';

export type CommentCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 20 | 30 | 40 | 50;

export interface CommentGeneratorConfig {
  postContent: string;
  language: string;
  style: CommentStyle;
  count: CommentCount;
  includeEmojis: boolean;
}

export interface CommentBatchEvent {
  type: 'batch';
  comments: string[];
  batchIndex: number;
  totalBatch: number;
}

export interface CommentDoneEvent {
  type: 'done';
  total: number;
  savedId?: string;
  savedCount?: number;
}

export interface CommentErrorEvent {
  type: 'error';
  message: string;
}

export type CommentSSEEvent = CommentBatchEvent | CommentDoneEvent | CommentErrorEvent;

export interface CommentCard {
  id: string;
  text: string;
  copied: boolean;
}
