import { Header } from '@/site/components/header/Header';
import { Footer } from '@/site/components/footer/Footer';
import '@/site/assets/styles/site.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-wrapper">
      <Header />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
}
