import { Header } from '@/site/components/header/Header';
import { Footer } from '@/site/components/footer/Footer';
import { FloatingContact } from '@/site/components/floating-contact/FloatingContact';
import { SiteStyles } from '@/site/components/SiteStyles';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteStyles />
      <div className="site-wrapper">
        <Header />
        <main className="main-content">{children}</main>
        <Footer />
        <FloatingContact />
      </div>
    </>
  );
}
