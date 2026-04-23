import Link from 'next/link';
import { categoryService } from '@/server/services/category.service';
import { dbSafe } from '@/lib/db-safe';

export async function Header() {
  const categories = await dbSafe(() => categoryService.getCategoryTree(), []);

  return (
    <header className="header v2026">
      <div className="container">
        <div className="header__top">
          <div>
            <Link href="/" className="header__logo" aria-label="logo">
              <img src="/images/logo_white.png" alt="Nội Thất Tiện Lợi" className="logo_site" />
            </Link>
            <form action="/tim-kiem" className="header__search">
              <input
                type="text"
                className="input-search"
                placeholder="Tìm kiếm sản phẩm..."
                name="key"
                autoComplete="off"
                maxLength={100}
              />
              <button type="submit" aria-label="Tìm kiếm">
                <i className="icon-search"></i>
              </button>
            </form>
            <div className="profile">
              <Link href="/tai-khoan" className="name-order active">
                <i className="icon-header-login"></i>
                <span>Đăng nhập</span>
              </Link>
            </div>
            <Link href="/gio-hang" className="header__cart menu-info">
              <div className="box-cart">
                <i className="iconnewglobal-whitecart"></i>
                <span className="cart-number">0</span>
              </div>
              <span>Giỏ hàng</span>
            </Link>
            <div className="header_support">
              <a href="tel:0865993334" className="name-support">
                <i className="icon-header-phone"></i>
                <span>086.599.3334</span>
              </a>
            </div>
            <div className="header_guarantee">
              <a href="#" className="name-guarantee">
                <i className="icon-header-guarantee"></i>
                <span>Bảo hành</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="top_bar_noithattienloi">
        <div className="container">
          <div className="header__main">
            <div id="hamber_menu" className="relative">
              <a className="txt_color_1 menu_hamber" href="#">
                <i className="icon-hamber"></i>
                DANH MỤC
              </a>
              <div id="sub_menu_web">
                <div className="col_menu_cap1">
                  {categories.map((cat) => (
                    <div className="sub_item_menu" key={cat.id}>
                      <Link className="parent_menu" href={`/danh-muc/${cat.slug}`}>
                        {cat.name}
                        {cat.children?.length > 0 && <em className="fa fa-angle-right"> </em>}
                      </Link>
                      {cat.children?.length > 0 && (
                        <div className="conten_hover_submenu">
                          <div className="col_hover_submenu">
                            {cat.children.map((child) => (
                              <Link key={child.id} href={`/danh-muc/${child.slug}`}>
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="item_sub_menu_bar left">
              <ul className="main-menu">
                <li><Link href="/">TRANG CHỦ</Link></li>
                <li><Link href="/gioi-thieu">GIỚI THIỆU</Link></li>
                <li><Link href="/san-pham">SẢN PHẨM</Link></li>
                <li><Link href="/flash-sale">FLASH SALE</Link></li>
                <li><Link href="/tin-tuc">TIN TỨC</Link></li>
                <li><Link href="/lien-he">LIÊN HỆ</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}