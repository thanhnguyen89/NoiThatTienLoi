'use client';

import { useState, useEffect } from 'react';
import './home-sections.css';

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

  if (slides.length === 0) return null;

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
                  <a href={slide.link || '#'} title={slide.title || ''}>
                    <img src={slide.image} alt={slide.title || ''} loading={i === 0 ? 'eager' : 'lazy'} />
                  </a>
                </li>
              ))}
            </ul>
            <ol className="flex-control-nav">
              {slides.map((_, i) => (
                <li key={i}>
                  <a
                    className={i === current ? 'flex-active' : ''}
                    onClick={() => setCurrent(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                </li>
              ))}
            </ol>
            <ul className="flex-direction-nav">
              <li><a className="flex-prev" onClick={prev}>Previous</a></li>
              <li><a className="flex-next" onClick={next}>Next</a></li>
            </ul>
          </div>
        </div>
        <div className="group_banner_right">
          <div className="item_banner_right">
            <a href="#" title="Giao hàng nhanh">
              <img src="/images/ship.jpg" alt="Giao hàng nhanh" />
            </a>
          </div>
          <div className="item_banner_right">
            <a href="#" title="Tải app nhận ưu đãi">
              <img src="/images/app.jpg" alt="Tải app nhận ưu đãi" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
