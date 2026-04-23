import { notFound } from 'next/navigation';
import { seoConfigService } from '@/server/services/seo-config.service';
import { DynamicSeoConfigFormClient } from '@/admin/components/SeoConfigFormWrapper';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata = { title: 'Chỉnh sửa cấu hình SEO' };

export default async function EditSeoConfigPage({ params }: Props) {
  const { id } = await params;
  let config = await seoConfigService.getSeoConfigById(id);
  if (!config) notFound();

  return (
    <DynamicSeoConfigFormClient
      config={{
        id:              config.id,
        pageName:        config.pageName,
        pageType:        config.pageType,
        title:           config.title,
        contentBefore:   config.contentBefore,
        contentAfter:    config.contentAfter,
        image:           config.image,
        icon:            config.icon,
        thumbnail:       config.thumbnail,
        banner:          config.banner,
        seName:          config.seName,
        metaKeywords:    config.metaKeywords,
        metaDescription: config.metaDescription,
        metaTitle:       config.metaTitle,
        isActive:        config.isActive,
        seoNoindex:      config.seoNoindex,
        seoCanonical:    config.seoCanonical,
        ogTitle:         config.ogTitle,
        ogDescription:   config.ogDescription,
        ogImage:         config.ogImage,
        sortOrder:       config.sortOrder,
      }}
    />
  );
}
