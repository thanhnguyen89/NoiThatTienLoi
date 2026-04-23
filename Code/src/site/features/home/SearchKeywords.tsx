import Link from 'next/link';

const KEYWORDS = [
  'Giường ngủ', 'Tủ quần áo', 'Bàn làm việc', 'Ghế văn phòng', 'Kệ tivi',
  'Sofa', 'Bàn ăn', 'Giường tầng', 'Tủ giày dép', 'Kệ sách',
  'Ghế xếp', 'Giường xếp', 'Võng xếp', 'Thang nhôm', 'Xe đẩy hàng',
  'Bàn học sinh', 'Tủ đầu giường', 'Giường sắt', 'Giường gỗ', 'Tủ nhựa',
  'Kệ nhựa', 'Ghế nhựa', 'Bàn nhựa', 'Giường tầng sắt', 'Giường tầng gỗ',
  'Thang nhôm chữ A', 'Thang nhôm rút gọn', 'Thang nhôm gấp', 'Xe đẩy 4 bánh', 'Xe đẩy 2 bánh',
  'Ghế xếp inox', 'Giường xếp inox', 'Võng xếp inox', 'Bàn gấp', 'Ghế gấp',
  'Kệ để đồ', 'Tủ đựng đồ', 'Giá treo quần áo', 'Móc treo đồ', 'Kệ góc tường',
  'Kệ treo tường', 'Bàn trang điểm', 'Tủ trang điểm', 'Ghế massage', 'Ghế thư giãn',
  'Bàn sofa', 'Bàn trà', 'Kệ trang trí',
];

export function SearchKeywords() {
  return (
    <section className="search-trend">
      <div className="bottom-search">
        <p className="bottom-search__title">Mọi người cũng tìm kiếm</p>
        <div className="bottom-search__container">
          <ul>
            <li style={{ listStyleType: 'none' }}>
              <ul>
                {KEYWORDS.map((kw) => (
                  <li key={kw}>
                    <Link href={`/san-pham?q=${encodeURIComponent(kw)}`}>{kw}</Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
