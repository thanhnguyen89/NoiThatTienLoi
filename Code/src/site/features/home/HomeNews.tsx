import Link from 'next/link';

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  image: string | null;
  slug: string;
}

interface HomeNewsProps {
  news: NewsItem[];
}

export function HomeNews({ news }: HomeNewsProps) {
  if (news.length === 0) return null;

  return (
    <section id="sec_home_news" className="home-news-section">
      <div className="home-news-header">
        <h2 className="home-news-title">Mạng xã hội noithattienloi.vn</h2>
      </div>

      <div className="home-news-grid">
        {news.map((item) => (
          <div key={item.id} className="news-card">
            <Link href={`/tin-tuc/${item.slug}`} className="news-thumb">
              {item.image ? (
                <img src={item.image} alt={item.title} loading="lazy" />
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#f0f0f0' }} />
              )}
            </Link>
            <div className="news-info">
              <h3 className="news-title">
                <Link href={`/tin-tuc/${item.slug}`}>{item.title}</Link>
              </h3>
              {item.summary && (
                <p className="news-summary">{item.summary}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="home-news-footer">
        <Link href="/tin-tuc" className="home-news-viewmore">Xem thêm →</Link>
      </div>
    </section>
  );
}