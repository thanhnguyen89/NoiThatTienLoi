'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Slide {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
}

interface HomeSliderProps {
  slides: Slide[];
}

export function HomeSlider({ slides }: HomeSliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    // Placeholder khi chưa có slides
    return (
      <div className="container-slider">
        <div className="slider_top">
          <div id="slider_item_big_top">
            <div style={{ background: 'linear-gradient(135deg, #1F7A5C 0%, #2e9e72 100%)', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Chào mừng đến với</div>
                <div style={{ fontSize: '28px', fontWeight: 700 }}>Nội Thất Tiện Lợi</div>
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>Sản phẩm chất lượng - Giá cả hợp lý</div>
              </div>
            </div>
          </div>
          <div className="group_banner_right">
            <div className="item_banner_right">
              <Link href="#" title="Giao hàng nhanh">
                <img src="/images/ship.jpg" alt="Giao hàng nhanh" />
              </Link>
            </div>
            <div className="item_banner_right">
              <Link href="#" title="Tải app nhận ưu đãi">
                <img src="/images/app.jpg" alt="Tải app nhận ưu đãi" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <div className="container-slider">
      <div className="slider_top">
        <div id="slider_item_big_top">
          <div className="flexslider">
            <ul className="slides">
              {slides.map((slide, i) => (
                <li key={slide.id} style={{ display: i === current ? 'block' : 'none' }}>
                  {slide.link ? (
                    <Link href={slide.link} title={slide.title || ''}>
                      <img src={slide.image} alt={slide.title || ''} loading={i === 0 ? 'eager' : 'lazy'} />
                    </Link>
                  ) : (
                    <img src={slide.image} alt={slide.title || ''} loading={i === 0 ? 'eager' : 'lazy'} />
                  )}
                </li>
              ))}
            </ul>
            <ol className="flex-control-nav">
              {slides.map((_, i) => (
                <li key={i}>
                  <a
                    className={i === current ? 'flex-active' : ''}
                    onClick={() => setCurrent(i)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Slide ${i + 1}`}
                  />
                </li>
              ))}
            </ol>
            <ul className="flex-direction-nav">
              <li><a className="flex-prev" onClick={prev} role="button" tabIndex={0}>Previous</a></li>
              <li><a className="flex-next" onClick={next} role="button" tabIndex={0}>Next</a></li>
            </ul>
          </div>
        </div>
        <div className="group_banner_right">
          <div className="item_banner_right">
            <Link href="#" title="Giao hàng nhanh">
              <img src="/images/ship.jpg" alt="Giao hàng nhanh" />
            </Link>
          </div>
          <div className="item_banner_right">
            <Link href="#" title="Tải app nhận ưu đãi">
              <img src="/images/app.jpg" alt="Tải app nhận ưu đãi" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}