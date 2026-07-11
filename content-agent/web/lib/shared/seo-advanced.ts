import type { AutoBoldOption } from '@/lib/shared/options';

export interface SeoAdvancedConfig {
  mainLink: string;
  keywordLinks: string;
  autoBold: AutoBoldOption;
  footerContent: string;
}

export const EMPTY_SEO_ADVANCED_CONFIG: SeoAdvancedConfig = {
  mainLink: '',
  keywordLinks: '',
  autoBold: 'none',
  footerContent: '',
};
