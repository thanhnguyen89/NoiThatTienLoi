import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer v2026">
      <div className="container">
        <section className="clearfix footer__top">
          {/* Cột 1: Tổng đài */}
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

          {/* Cột 2: Về công ty */}
          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Về công ty</strong></p>
            </div>
            <ul className="f-listmenu">
              <li><Link href="/gioi-thieu">Giới thiệu công ty</Link></li>
              <li><Link href="/lien-he">Gửi góp ý, khiếu nại</Link></li>
            </ul>
          </div>

          {/* Cột 3: Thông tin khác */}
          <div className="footer__col">
            <div className="f-listtel">
              <p className="f-listtel__title"><strong>Thông tin khác</strong></p>
            </div>
            <ul className="f-listmenu">
              <li><Link href="#">Chính sách bảo hành</Link></li>
              <li><Link href="#">Lịch sử mua hàng</Link></li>
            </ul>
          </div>

          {/* Cột 4: Chính sách */}
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

      {/* Footer content (giữa footer top và copyright) */}
      <div className="footer-content-wrapper">
        <div className="container">
          <div className="footer-content">
            <div className="content-text">
              <h2>NỘI THẤT TIỆN LỢI - CHẤT LƯỢNG THẬT - GIÁ TRỊ THẬT</h2>
              <p>
                <strong>NoiThatTienLoi.vn</strong> là hệ thống cửa hàng nội thất chính hãng và dịch vụ
                thi công nội thất chuyên sâu với hệ thống cửa hàng trải dài trên toàn quốc.
              </p>
              <p>
                Với phương châm &quot;Chất lượng thật - Giá trị thật&quot;, <strong>NoiThatTienLoi.vn</strong> luôn
                nỗ lực không ngừng nhằm nâng cao chất lượng sản phẩm &amp; dịch vụ.
              </p>
              <p>
                Đối với khách hàng online, <strong>NoiThatTienLoi.vn</strong> áp dụng GIAO NHANH 2H MIỄN
                PHÍ cho <strong>đơn hàng từ 500.000đ</strong>.
              </p>
            </div>

            <div className="footer-categories">
              <h3>DANH MỤC SẢN PHẨM</h3>
              <div className="footer-cat-grid">
                <div className="category-col">
                  <h4>Nội Thất Phòng Ngủ</h4>
                  <ul>
                    <li><a href="#">Giường Ngủ</a></li>
                    <li><a href="#">Giường Tầng</a></li>
                    <li><a href="#">Tủ Quần Áo</a></li>
                    <li><a href="#">Tủ Đầu Giường</a></li>
                    <li><a href="#">Bàn Trang Điểm</a></li>
                  </ul>
                </div>
                <div className="category-col">
                  <h4>Nội Thất Phòng Khách</h4>
                  <ul>
                    <li><a href="#">Sofa</a></li>
                    <li><a href="#">Bàn Trà</a></li>
                    <li><a href="#">Kệ Tivi</a></li>
                    <li><a href="#">Tủ Trang Trí</a></li>
                    <li><a href="#">Bàn Sofa</a></li>
                  </ul>
                </div>
                <div className="category-col">
                  <h4>Nội Thất Văn Phòng</h4>
                  <ul>
                    <li><a href="#">Bàn Làm Việc</a></li>
                    <li><a href="#">Ghế Văn Phòng</a></li>
                    <li><a href="#">Kệ Sách</a></li>
                    <li><a href="#">Tủ Hồ Sơ</a></li>
                    <li><a href="#">Bàn Họp</a></li>
                  </ul>
                </div>
                <div className="category-col">
                  <h4>Nội Thất Đa Năng</h4>
                  <ul>
                    <li><a href="#">Ghế Xếp</a></li>
                    <li><a href="#">Giường Xếp</a></li>
                    <li><a href="#">Võng Xếp</a></li>
                    <li><a href="#">Thang Nhôm</a></li>
                    <li><a href="#">Xe Đẩy Hàng</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="copyright">
        <section>
          <p>Copyright © noithatminhqui.vn. All rights reserved.</p>
        </section>
      </div>
    </footer>
  );
}