import type { Metadata } from 'next';
import { Breadcrumb } from '@/site/shared/Breadcrumb';
import { ContactForm } from '@/site/features/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Liên hệ',
  description: 'Liên hệ với Nội Thất Tiện Lợi',
};

export default function ContactPage() {
  return (
    <div className="container">
      <Breadcrumb items={[{ label: 'Trang chủ', href: '/' }, { label: 'Liên hệ' }]} />
      <ContactForm />
    </div>
  );
}
