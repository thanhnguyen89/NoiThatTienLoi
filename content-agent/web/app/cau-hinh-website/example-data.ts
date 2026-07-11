/**
 * Example data for testing Website Configuration
 * 
 * Các ví dụ này có thể dùng để:
 * - Test UI components
 * - Seed database
 * - Documentation
 */

import { WebsiteConfig } from './types';

// ─── Example 1: Hasaki Vietnam ────────────────────────────────────────────────

export const hasakiExample: Partial<WebsiteConfig> = {
  name: 'Hasaki Vietnam - Main Site',
  url: 'https://www.hasaki.vn',
  platform: 'wordpress',
  
  // Company Info
  companyName: 'HASAKI VIỆT NAM',
  hotline: '1800 6324',
  hotlineComplaint: '1800 6310',
  branchCount: 323,
  branchListUrl: 'https://hotro.hasaki.vn/he-thong-cua-hang.html',
  supportInfo: 'Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic',
  
  // API Config
  apiUrl: 'https://www.hasaki.vn/wp-json/wp/v2',
  username: 'admin',
  // appPassword: 'xxxx xxxx xxxx xxxx xxxx xxxx', // Don't commit real passwords!
  
  // Defaults
  defaultCategory: 1,
  defaultAuthorId: 1,
  defaultStatus: 'draft',
  isActive: true,
  isDefault: true,
};

// ─── Example 2: Shopify Store ─────────────────────────────────────────────────

export const shopifyExample: Partial<WebsiteConfig> = {
  name: 'My Fashion Store - Shopify',
  url: 'https://myfashionstore.myshopify.com',
  platform: 'shopify',
  
  // Company Info
  companyName: 'Fashion Store Co., Ltd',
  hotline: '1900 1234',
  branchCount: 5,
  
  // API Config
  apiUrl: 'https://myfashionstore.myshopify.com/admin/api/2024-01/graphql.json',
  // apiKey: 'your-api-key',
  // apiSecret: 'your-api-secret',
  
  // Defaults
  defaultStatus: 'draft',
  isActive: true,
  isDefault: false,
};

// ─── Example 3: Custom API ────────────────────────────────────────────────────

export const customApiExample: Partial<WebsiteConfig> = {
  name: 'Internal Blog - Custom CMS',
  url: 'https://blog.mycompany.com',
  platform: 'custom',
  
  // Company Info
  companyName: 'My Company Ltd',
  hotline: '028 1234 5678',
  
  // API Config
  apiUrl: 'https://api.mycompany.com/v1/posts',
  // apiKey: 'your-custom-api-key',
  username: 'api_user',
  // appPassword: 'api_password',
  
  // Defaults
  defaultStatus: 'pending',
  isActive: true,
  isDefault: false,
};

// ─── Example 4: Static Site ───────────────────────────────────────────────────

export const staticSiteExample: Partial<WebsiteConfig> = {
  name: 'Company Landing Page',
  url: 'https://www.mycompany.com',
  platform: 'static',
  
  // Company Info
  companyName: 'My Company Ltd',
  hotline: '1800 9999',
  branchCount: 10,
  branchListUrl: 'https://www.mycompany.com/locations',
  
  // API Config (not used for static)
  apiUrl: 'https://www.mycompany.com',
  
  // Defaults
  defaultStatus: 'draft',
  isActive: true,
  isDefault: false,
};

// ─── Example 5: Wix Site ──────────────────────────────────────────────────────

export const wixExample: Partial<WebsiteConfig> = {
  name: 'Portfolio Website - Wix',
  url: 'https://myportfolio.wixsite.com/mysite',
  platform: 'wix',
  
  // API Config
  apiUrl: 'https://www.wixapis.com/v1/sites/mysite/posts',
  // apiKey: 'wix-api-key',
  // apiSecret: 'wix-api-secret',
  
  // Defaults
  defaultStatus: 'publish',
  isActive: true,
  isDefault: false,
};

// ─── All Examples ─────────────────────────────────────────────────────────────

export const allExamples = [
  hasakiExample,
  shopifyExample,
  customApiExample,
  staticSiteExample,
  wixExample,
];

// ─── Seed Function ────────────────────────────────────────────────────────────

/**
 * Function to seed database with example data
 * Usage: Call this from a seed script or admin panel
 */
export async function seedWebsiteConfigs() {
  const results = [];
  
  for (const example of allExamples) {
    try {
      const response = await fetch('/api/website-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(example),
      });
      
      const data = await response.json();
      results.push({ success: data.success, name: example.name });
    } catch (error) {
      results.push({ success: false, name: example.name, error });
    }
  }
  
  return results;
}

// ─── Test Data Generator ──────────────────────────────────────────────────────

/**
 * Generate random test data
 */
export function generateTestWebsite(index: number): Partial<WebsiteConfig> {
  const platforms = ['wordpress', 'shopify', 'wix', 'custom', 'static'];
  const platform = platforms[index % platforms.length];
  
  return {
    name: `Test Website ${index + 1}`,
    url: `https://test${index + 1}.example.com`,
    platform,
    companyName: `Test Company ${index + 1}`,
    hotline: `1800 ${1000 + index}`,
    branchCount: Math.floor(Math.random() * 100) + 1,
    apiUrl: `https://test${index + 1}.example.com/api`,
    username: `user${index + 1}`,
    defaultStatus: 'draft',
    isActive: true,
    isDefault: index === 0,
  };
}

/**
 * Generate multiple test websites
 */
export function generateTestWebsites(count: number): Partial<WebsiteConfig>[] {
  return Array.from({ length: count }, (_, i) => generateTestWebsite(i));
}
