# Cấu Hình Website - Component Structure

## 📁 File Structure

```
cau-hinh-website/
├── page.tsx                    # Main page component
├── page.old.tsx               # Backup of old version
├── types.ts                   # TypeScript types & constants
├── README.md                  # This file
├── components/
│   ├── WebsiteModal.tsx      # Modal form for add/edit website
│   └── WebsiteCard.tsx       # Card component to display website info
└── hooks/
    └── useWebsiteConfig.ts   # Custom hook for state management
```

## 🎯 Features

### Supported Platforms
- WordPress (REST API)
- Shopify (Admin API)
- Wix (REST API)
- Custom API
- Static Site

### Company Information
- Company name
- Hotline & complaint hotline
- Branch count & branch list URL
- Support information

### Authentication Methods
- Basic Auth (username + password)
- API Auth (API key + secret)
- Flexible (both methods)
- None (static sites)

## 🔧 Usage

### Import Components

```typescript
import { useWebsiteConfig } from './hooks/useWebsiteConfig';
import WebsiteModal from './components/WebsiteModal';
import WebsiteCard from './components/WebsiteCard';
import { PLATFORM_TYPES, STATUS_OPTIONS } from './types';
```

### Use Custom Hook

```typescript
const {
  websites,
  loading,
  showModal,
  editingWebsite,
  formData,
  saving,
  setFormData,
  loadWebsites,
  openAddModal,
  openEditModal,
  closeModal,
  saveWebsite,
  deleteWebsite,
} = useWebsiteConfig();
```

### Render Components

```typescript
<WebsiteCard 
  website={website} 
  onEdit={openEditModal} 
  onDelete={handleDelete} 
/>

<WebsiteModal
  isOpen={showModal}
  onClose={closeModal}
  editingWebsite={editingWebsite}
  formData={formData}
  onFormChange={setFormData}
  onSave={handleSave}
  isSaving={saving}
/>
```

## 📝 Example: Add Hasaki Website

```typescript
{
  name: "Hasaki Vietnam",
  url: "https://www.hasaki.vn",
  platform: "wordpress",
  companyName: "HASAKI VIỆT NAM",
  hotline: "1800 6324",
  hotlineComplaint: "1800 6310",
  branchCount: 323,
  branchListUrl: "https://hotro.hasaki.vn/he-thong-cua-hang.html",
  supportInfo: "Nhấn Phím 1 cho Mỹ phẩm, Phím 2 cho Clinic",
  apiUrl: "https://www.hasaki.vn/wp-json/wp/v2",
  username: "admin",
  appPassword: "xxxx xxxx xxxx xxxx",
  defaultStatus: "draft",
  isActive: true,
  isDefault: true
}
```

## 🔐 Security

- Passwords and API secrets are never exposed in responses
- Sensitive fields show `••••••••` placeholder
- Only updated when user enters new value
- `hasPassword`, `hasApiKey`, `hasApiSecret` flags indicate if credentials exist

## 🎨 Styling

Uses Tailwind CSS with:
- Responsive design
- Hover states
- Loading states
- Toast notifications
- Modal overlays
- Color-coded status indicators

## 🚀 Future Improvements

- [ ] Add React Query for caching
- [ ] Add Zod validation
- [ ] Add search & filter
- [ ] Add pagination
- [ ] Add bulk actions
- [ ] Add export/import
- [ ] Add keyboard shortcuts
- [ ] Improve accessibility
