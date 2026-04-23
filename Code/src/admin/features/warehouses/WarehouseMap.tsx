'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  warehouseId: string;
  warehouseName: string;
  warehouseAddress: string;
  latitude: number;
  longitude: number;
}

export default function WarehouseMap({ warehouseName, warehouseAddress, latitude, longitude }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    setLoading(true);
    setError(null);

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current).setView([latitude, longitude], 15);

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom warehouse icon (SVG marker)
      const warehouseIcon = L.divIcon({
        className: 'custom-warehouse-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: #0d6efd;
            border: 3px solid #fff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <i class="bi bi-house-door-fill" style="
              transform: rotate(45deg);
              color: #fff;
              font-size: 18px;
            "></i>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -44],
      });

      // Add marker with popup
      const marker = L.marker([latitude, longitude], { icon: warehouseIcon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong style="font-size: 14px;">${warehouseName}</strong>
          <hr style="margin: 4px 0;" />
          <p style="margin: 0; font-size: 12px; color: #666;">
            <i class="bi bi-geo-alt-fill" style="color: #0d6efd;"></i>
            ${warehouseAddress}
          </p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #999;">
            ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
          </p>
          <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" rel="noopener noreferrer"
             style="font-size: 11px; color: #0d6efd; text-decoration: none; margin-top: 4px; display: inline-block;">
            <i class="bi bi-box-arrow-up-right"></i> Mở Google Maps
          </a>
        </div>
      `).openPopup();

      mapInstanceRef.current = map;
      setLoading(false);
    }).catch((err: Error) => {
      console.error('Leaflet load error:', err);
      setError('Không thể tải bản đồ. Vui lòng thử lại.');
      setLoading(false);
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, warehouseName, warehouseAddress]);

  return (
    <div>
      <div className="alert alert-info py-2 mb-3">
        <i className="bi bi-geo-alt-fill me-2"></i>
        <strong>Vị trí kho:</strong> {warehouseName} — {warehouseAddress}
        <br />
        <span className="small">Tọa độ: {latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
      </div>

      {loading && (
        <div className="text-center py-4">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Đang tải bản đồ...
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2">{error}</div>
      )}

      <div
        ref={mapRef}
        style={{
          height: 450,
          borderRadius: 8,
          border: '1px solid #dee2e6',
          display: loading || error ? 'none' : 'block',
          overflow: 'hidden',
        }}
      />

      {/* Map action buttons */}
      <div className="mt-2 d-flex gap-2">
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary"
        >
          <i className="bi bi-box-arrow-up-right me-1"></i>Mở Google Maps
        </a>
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=16`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-secondary"
        >
          <i className="bi bi-map me-1"></i>Mở OpenStreetMap
        </a>
      </div>
    </div>
  );
}
