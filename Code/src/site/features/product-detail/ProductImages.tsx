'use client';

interface ProductImagesProps {
  images: Array<{ id: string; url: string; alt: string | null; sortOrder: number }>;
  productName: string;
}

export function ProductImages({ images, productName }: ProductImagesProps) {
  if (images.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>Chưa có hình ảnh</div>;
  }

  return (
    <div className="product-images">
      <div className="product-images__main">
        <img src={images[0].url} alt={images[0].alt || productName} />
      </div>
      {images.length > 1 && (
        <div className="product-images__thumbs">
          {images.map((img) => (
            <img key={img.id} src={img.url} alt={img.alt || productName} />
          ))}
        </div>
      )}
    </div>
  );
}
