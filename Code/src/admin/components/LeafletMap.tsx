'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icon issue with Leaflet in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  selectedLocation?: string;
}

export function LeafletMap({ 
  center = [10.8231, 106.6297], // TP.HCM default
  zoom = 13,
  onLocationSelect,
  selectedLocation 
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Chỉ khởi tạo map một lần
    if (mapRef.current) return;

    // Khởi tạo map
    const map = L.map('leaflet-map', {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Thêm tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsLoading(false);

    // Xử lý click trên map
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // Xóa marker cũ nếu có
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Thêm marker mới
      const marker = L.marker([lat, lng]).addTo(map);
      markerRef.current = marker;

      // Reverse geocoding đơn giản (dùng Nominatim - miễn phí)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'NoiThatMinhQuan/1.0'
            }
          }
        );
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        // Hiển thị popup
        marker.bindPopup(`<b>Vị trí đã chọn</b><br>${address}`).openPopup();

        // Callback
        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        marker.bindPopup(`<b>Vị trí đã chọn</b><br>${address}`).openPopup();
        
        if (onLocationSelect) {
          onLocationSelect({ lat, lng, address });
        }
      }
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center khi selectedLocation thay đổi
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;

    // Parse coordinates từ selectedLocation nếu có
    const coordsMatch = selectedLocation.match(/(\d+\.\d+)°\s*N,\s*(\d+\.\d+)°\s*E/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      
      mapRef.current.setView([lat, lng], 15);
      
      // Thêm marker
      if (markerRef.current) {
        markerRef.current.remove();
      }
      const marker = L.marker([lat, lng]).addTo(mapRef.current);
      marker.bindPopup(`<b>${selectedLocation}</b>`).openPopup();
      markerRef.current = marker;
    }
  }, [selectedLocation]);

  return (
    <div style={{ position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f9fa',
          zIndex: 1000
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      <div 
        id="leaflet-map" 
        style={{ 
          height: '300px', 
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
      <div className="mt-2 text-muted small">
        <i className="bi bi-info-circle me-1"></i>
        Click trên bản đồ để chọn vị trí
      </div>
    </div>
  );
}
