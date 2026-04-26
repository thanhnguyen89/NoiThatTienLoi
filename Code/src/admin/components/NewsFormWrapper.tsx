'use client';

import dynamic from 'next/dynamic';

const DynamicNewsForm = dynamic(
  () => import('@/admin/features/news/NewsForm').then(m => m.NewsForm),
  {
    ssr: false,
    loading: () => (
      <div style={{
        minHeight: 400,
        background: '#f9f9f9',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6c757d',
      }}>
        Dang tai...
      </div>
    ),
  }
);

interface CategoryOption {
  id: string;
  title: string | null;
}

interface Props {
  news?: {
    id: string;
    title: string | null;
    summary: string | null;
    content: string | null;
    image: string | null;
    seName: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    isPublished: boolean | null;
    isShowHome: boolean | null;
    isActive: boolean | null;
    isNew: boolean | null;
    allowComments: boolean | null;
    newTag: string | null;
    sortOrder: number | null;
    slugRedirect: string | null;
    seoCanonical: string | null;
    seoNoindex: boolean | null;
    isRedirect: boolean | null;
    authorName: string | null;
    publishedAt: Date | string | null;
    viewCount: number | null;
    commentCount: number | null;
    likeCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    // SEO fields
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
    isMobile: boolean | null;
    fbTitle: string | null;
    fbDescription: string | null;
    fbKeywords: string | null;
    fbHashtags: string | null;
    fbLocation: string | null;
    fbImage: string | null;
    fbLinkPosted: string | null;
    ttTitle: string | null;
    ttDescription: string | null;
    ttKeywords: string | null;
    ttHashtags: string | null;
    ttLocation: string | null;
    ttImage: string | null;
    ttLinkPosted: string | null;
    ytTitle: string | null;
    ytDescription: string | null;
    ytTags: string | null;
    ytHashtags: string | null;
    ytLocation: string | null;
    ytImage: string | null;
    ytLinkPosted: string | null;
    // 28 fields mới
    authorId: string | null;
    authorEmail: string | null;
    authorAvatar: string | null;
    tags: string | null;
    categoryName: string | null;
    categorySlug: string | null;
    readingTime: number | null;
    featuredImage: string | null;
    featuredImageAlt: string | null;
    featuredImageCaption: string | null;
    galleryImages: string | null;
    videoUrl: string | null;
    videoThumbnail: string | null;
    audioUrl: string | null;
    relatedNewsIds: string | null;
    externalUrl: string | null;
    isExternalLink: boolean | null;
    openInNewTab: boolean | null;
    isFeatured: boolean | null;
    isBreakingNews: boolean | null;
    isPinned: boolean | null;
    expiryDate: Date | string | null;
    scheduledPublishDate: Date | string | null;
    lastModifiedBy: string | null;
    revisionNumber: number | null;
    contentFormat: string | null;
    customCss: string | null;
    customJs: string | null;
    jsonData: string | null;
  };
  categories?: CategoryOption[];
}

export function DynamicNewsFormClient(props: Props) {
  return <DynamicNewsForm {...props} />;
}
