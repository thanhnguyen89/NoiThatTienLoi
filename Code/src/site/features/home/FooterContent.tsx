import './home-sections.css';

export function FooterContent() {
  return (
    <div className="footer-content">
      <div className="content-text">
        <h2>NỘI THẤT TIỆN LỢI - CHẤT LƯỢNG THẬT - GIÁ TRỊ THẬT</h2>
        <p>
          <strong>NoiThatTienLoi.vn</strong> là hệ thống cửa hàng nội thất chính hãng và dịch vụ
          thi công nội thất chuyên sâu với hệ thống cửa hàng trải dài trên toàn quốc; và hiện đang
          là đối tác phân phối chiến lược tại thị trường Việt Nam của hàng loạt thương hiệu lớn.
        </p>
        <p>
          Với phương châm "Chất lượng thật - Giá trị thật", <strong>NoiThatTienLoi.vn</strong> luôn
          nỗ lực không ngừng nhằm nâng cao chất lượng sản phẩm &amp; dịch vụ để khách hàng có được
          những trải nghiệm mua sắm tốt nhất. Toàn bộ sản phẩm có ở <strong>NoiThatTienLoi.vn</strong>{' '}
          đều được cam kết 100% chính hãng, đảm bảo nguồn gốc xuất xứ.
        </p>
        <p>
          Đối với khách hàng online, <strong>NoiThatTienLoi.vn</strong> áp dụng GIAO NHANH 2H MIỄN
          PHÍ cho <strong>đơn hàng từ 500.000đ</strong> tại các khu vực: Hồ Chí Minh - Hà Nội.{' '}
          <strong>Đơn hàng từ 1.000.000đ</strong>, <strong>NoiThatTienLoi.vn</strong> giao{' '}
          MIỄN PHÍ TOÀN QUỐC.
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
  );
}
