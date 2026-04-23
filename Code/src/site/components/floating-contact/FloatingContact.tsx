'use client';

export function FloatingContact() {
  return (
    <section className="section-cta-sidebar">
      <ul className="cta-lists">
        <li className="btn-cta btn-link cta-mess" data-attr="cta-mess">
          <div className="btn-cta-wrapper">
            <div className="circle-fill"></div>
            <div className="cta-img-circle">
              <a href="https://www.messenger.com/t/0865993334" target="_blank" rel="noopener noreferrer" aria-label="Messenger">
                <img src="/images/icon_mess.png" alt="Messenger" />
              </a>
            </div>
          </div>
        </li>
        <li className="btn-cta has-popup cta-phone" data-attr="cta-phone">
          <div className="btn-cta-wrapper">
            <div className="circle-fill"></div>
            <div className="cta-img-circle">
              <a href="tel:0865993334" aria-label="Phone">
                <img src="/images/phone.png" alt="Phone" />
              </a>
            </div>
          </div>
        </li>
        <li className="btn-cta cta-zalo" data-attr="cta-zalo">
          <div className="btn-cta-wrapper">
            <div className="circle-fill"></div>
            <div className="cta-img-circle">
              <a href="https://zalo.me/0865993334" target="_blank" rel="noopener noreferrer" aria-label="Zalo">
                <img src="/images/zalo.png" alt="Zalo" />
              </a>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
}