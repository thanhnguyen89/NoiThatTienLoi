import Link from 'next/link';
import './footer.css';

export function Footer() {
  return (
    <footer className="footer v2026">
      <div className="container">
        <section className="clearfix footer__top">
          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Tổng đài hỗ trợ</strong></p>
              <p className="f-listtel__content">
                <span>Gọi mua:</span> <a href="tel:0865993334">086.599.3334</a> (8:00 - 21:30)
              </p>
              <p className="f-listtel__content">
                <span>Khiếu nại:</span> <a href="tel:0865993334">086.599.3334</a> (8:00 - 21:30)
              </p>
              <p className="f-listtel__content">
                <span>Bảo hành:</span> <a href="tel:0865993334">086.599.3334</a> (8:00 - 21:00)
              </p>
            </div>
          </div>

          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Về công ty</strong></p>
            </div>
            <ul className="f-listmenu">
              <li><Link href="/gioi-thieu">Giới thiệu công ty</Link></li>
              <li><Link href="/lien-he">Gửi góp ý, khiếu nại</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Thông tin khác</strong></p>
            </div>
            <ul className="f-listmenu">
              <li><Link href="#">Chính sách bảo hành</Link></li>
              <li><Link href="#">Lịch sử mua hàng</Link></li>
            </ul>
          </div>

          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Chính sách</strong></p>
            </div>
            <ul className="f-listmenu">
              <li><Link href="#">Chính sách bảo hành, đổi trả</Link></li>
              <li><Link href="#">Chính sách thanh toán</Link></li>
              <li><Link href="#">Chính sách bảo mật</Link></li>
            </ul>
          </div>
        </section>
      </div>
      <div className="copyright">
        <section>
          <p>Copyright © noithattienloi.vn. All rights reserved.</p>
        </section>
      </div>
    </footer>
  );
}
