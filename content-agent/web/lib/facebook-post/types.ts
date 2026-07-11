export type FacebookPostTone =
  | 'friendly'
  | 'professional'
  | 'casual'
  | 'sales'
  | 'rewrite'
  | 'shorten';

export type FacebookPostTemplate =
  | ''
  | 'product_intro'
  | 'combo_wholesale'
  | 'bulk_b2b'
  | 'friendly_stock'
  | 'branding';

export interface FacebookPostRequest {
  modelId: string;
  keyword: string;
  wordCount: number;
  tone: FacebookPostTone;
  template: Exclude<FacebookPostTemplate, ''> | null;
  shopName: string;
  industry: string;
  brandPronouns: string;
  brandAudience: string;
  brandToneNotes: string;
  phone: string;
  address: string;
  brandDesc: string;
  brandForbidden: string;
  ctaStandard: string;
  mainProducts: string;
  includeEmojis: boolean;
  includeHashtags: boolean;
  freeShip: boolean;
  urgency: boolean;
}

export interface FacebookPostRawRequest extends Partial<FacebookPostRequest> {
  provider?: string | null;
}
