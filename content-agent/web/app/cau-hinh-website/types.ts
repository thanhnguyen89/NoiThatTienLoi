// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebsiteConfig {
  id: string;
  name: string;
  url: string;
  platform: string;
  
  // Thông tin doanh nghiệp
  companyName?: string | null;
  hotline?: string | null;
  hotlineComplaint?: string | null;
  branchCount?: number | null;
  branchListUrl?: string | null;
  supportInfo?: string | null;
  
  // API Configuration
  apiUrl: string;
  apiKey?: string | null;
  apiSecret?: string | null;
  username: string | null;
  appPassword: string | null;
  hasPassword: boolean;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  
  // Defaults
  defaultCategory: number | null;
  defaultAuthorId: number | null;
  defaultStatus: string;
  
  // Status
  isActive: boolean;
  isDefault: boolean;
}

export interface SocialPlatform {
  id: string;
  type: string;
  name: string;
  pageId: string | null;
  pageUrl: string | null;
  accessToken: string | null;
  hasToken: boolean;
  accessTokenExpiry: string | null;
  isActive: boolean;
  isDefault: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PLATFORM_TYPES = [
  { 
    value: 'wordpress', 
    label: 'WordPress', 
    icon: '📝', 
    color: 'blue',
    requiresAuth: true,
    authType: 'basic', // username + appPassword
    description: 'WordPress REST API với Application Password'
  },
  { 
    value: 'shopify', 
    label: 'Shopify', 
    icon: '🛍️', 
    color: 'green',
    requiresAuth: true,
    authType: 'api', // apiKey + apiSecret
    description: 'Shopify Admin API'
  },
  { 
    value: 'wix', 
    label: 'Wix', 
    icon: '🎨', 
    color: 'purple',
    requiresAuth: true,
    authType: 'api',
    description: 'Wix REST API'
  },
  { 
    value: 'custom', 
    label: 'Custom API', 
    icon: '⚙️', 
    color: 'gray',
    requiresAuth: true,
    authType: 'flexible', // có thể dùng cả basic hoặc api
    description: 'API tùy chỉnh của bạn'
  },
  { 
    value: 'static', 
    label: 'Static Site', 
    icon: '📄', 
    color: 'gray',
    requiresAuth: false,
    authType: 'none',
    description: 'Website tĩnh (chỉ lưu thông tin)'
  },
];

export const SOCIAL_TYPES = [
  { value: 'FACEBOOK_PAGE', label: 'Facebook Page',  icon: '📘', color: 'blue'   },
  { value: 'TIKTOK',        label: 'TikTok',         icon: '🎵', color: 'gray'   },
  { value: 'ZALO_OA',       label: 'Zalo OA',        icon: '💬', color: 'blue'   },
  { value: 'INSTAGRAM',     label: 'Instagram',      icon: '📸', color: 'pink'   },
  { value: 'YOUTUBE',       label: 'YouTube',        icon: '▶️',  color: 'red'    },
  { value: 'THREADS',       label: 'Threads',        icon: '🧵', color: 'gray'   },
];

export const STATUS_OPTIONS = [
  { value: 'draft',   label: 'Nháp (draft)' },
  { value: 'publish', label: 'Đăng ngay (publish)' },
  { value: 'pending', label: 'Chờ duyệt (pending)' },
];

// ─── Empty forms ──────────────────────────────────────────────────────────────

export const emptyWebsite: Omit<WebsiteConfig, 'id' | 'hasPassword' | 'hasApiKey' | 'hasApiSecret'> = {
  name: '', 
  url: '', 
  platform: 'wordpress', 
  apiUrl: '',
  companyName: '',
  hotline: '',
  hotlineComplaint: '',
  branchCount: null,
  branchListUrl: '',
  supportInfo: '',
  username: '', 
  appPassword: '',
  apiKey: '',
  apiSecret: '',
  defaultCategory: null, 
  defaultAuthorId: null, 
  defaultStatus: 'draft',
  isActive: true, 
  isDefault: false,
};

export const emptySocial: Omit<SocialPlatform, 'id' | 'hasToken'> = {
  type: 'FACEBOOK_PAGE', 
  name: '', 
  pageId: '', 
  pageUrl: '',
  accessToken: '', 
  accessTokenExpiry: null,
  isActive: true, 
  isDefault: false,
};
