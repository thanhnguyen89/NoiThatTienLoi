# Hướng dẫn tích hợp Google Maps vào Location Picker

## 📋 Tổng quan

Hiện tại LocationPickerModal đang sử dụng placeholder cho bản đồ. Tài liệu này hướng dẫn cách tích hợp Google Maps thực tế.

## 🔑 Bước 1: Lấy Google Maps API Key

### 1.1. Truy cập Google Cloud Console
```
https://console.cloud.google.com/
```

### 1.2. Tạo hoặc chọn Project
- Click "Select a project" → "New Project"
- Đặt tên: "NoiThatMinhQuan-Maps"
- Click "Create"

### 1.3. Enable APIs
Vào **APIs & Services** → **Library**, enable các API sau:
- ✅ Maps JavaScript API
- ✅ Places API (optional - cho autocomplete)
- ✅ Geocoding API (optional - cho tìm kiếm địa chỉ)

### 1.4. Tạo API Key
1. Vào **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy API Key
4. Click **Restrict Key** để bảo mật:
   - **Application restrictions**: HTTP referrers
   - **Website restrictions**: Thêm domain của bạn
     ```
     https://yourdomain.com/*
     http://localhost:3000/*
     ```
   - **API restrictions**: Restrict key
     - Chọn: Maps JavaScript API, Places API, Geocoding API

### 1.5. Lưu API Key vào .env
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

---

## 📦 Bước 2: Cài đặt thư viện

### Option 1: @react-google-maps/api (Recommended)
```bash
npm install @react-google-maps/api
```

### Option 2: @googlemaps/js-api-loader
```bash
npm install @googlemaps/js-api-loader
```

---

## 💻 Bước 3: Tạo Google Maps Component

### 3.1. Tạo file GoogleMapPicker.tsx

```tsx
// src/admin/components/GoogleMapPicker.tsx
'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface GoogleMapPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialCenter?: { lat: number; lng: number };
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: 10.8231, // TP.HCM
  lng: 106.6297
};

export function GoogleMapPicker({ onLocationSelect, initialCenter }: GoogleMapPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialCenter || null
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      setMarker({ lat, lng });

      // Reverse geocoding để lấy địa chỉ
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        
        if (result.results[0]) {
          const address = result.results[0].formatted_address;
          onLocationSelect({ lat, lng, address });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      }
    },
    [onLocationSelect]
  );

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={initialCenter || defaultCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {marker && <Marker position={marker} animation={google.maps.Animation.DROP} />}
      </GoogleMap>
    </LoadScript>
  );
}
```

---

## 🔄 Bước 4: Cập nhật LocationPickerModal

### 4.1. Import GoogleMapPicker

```tsx
import { GoogleMapPicker } from './GoogleMapPicker';
```

### 4.2. Thay thế Map Placeholder

```tsx
// Thay thế phần Map Placeholder bằng:
<GoogleMapPicker
  onLocationSelect={(location) => {
    setSelectedLocation(location.address);
    // Optional: Lưu tọa độ nếu cần
    console.log('Selected coordinates:', location.lat, location.lng);
  }}
  initialCenter={
    selectedLocation 
      ? getCoordinatesFromLocation(selectedLocation) 
      : undefined
  }
/>
```

### 4.3. Helper function (optional)

```tsx
// Chuyển đổi tên vị trí thành tọa độ
function getCoordinatesFromLocation(locationName: string): { lat: number; lng: number } | undefined {
  const locationMap: Record<string, { lat: number; lng: number }> = {
    'Nội Thất Minh Quân - TP. Hồ Chí Minh': { lat: 10.8231, lng: 106.6297 },
    'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM': { lat: 10.8526, lng: 106.6177 },
    // ... thêm các vị trí khác
  };
  
  return locationMap[locationName];
}
```

---

## 🎨 Bước 5: Tùy chỉnh giao diện (Optional)

### 5.1. Custom Map Styles

```tsx
const mapStyles = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  // Thêm styles khác...
];

<GoogleMap
  options={{
    styles: mapStyles,
    // ...
  }}
/>
```

### 5.2. Thêm Search Box

```tsx
import { StandaloneSearchBox } from '@react-google-maps/api';

const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

<StandaloneSearchBox
  onLoad={(ref) => setSearchBox(ref)}
  onPlacesChanged={() => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places && places[0]) {
        const location = places[0].geometry?.location;
        if (location) {
          setMarker({ lat: location.lat(), lng: location.lng() });
          map?.panTo(location);
        }
      }
    }
  }}
>
  <input
    type="text"
    placeholder="Tìm kiếm địa điểm..."
    className="form-control mb-3"
  />
</StandaloneSearchBox>
```

---

## 🌍 Alternative: OpenStreetMap (Miễn phí)

Nếu không muốn dùng Google Maps (có phí), có thể dùng OpenStreetMap với Leaflet.

### Cài đặt
```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

### Component
```tsx
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function LocationMarker({ onLocationSelect }: any) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    },
  });

  return position ? <Marker position={position} /> : null;
}

export function OpenStreetMapPicker({ onLocationSelect }: any) {
  return (
    <MapContainer
      center={[10.8231, 106.6297]}
      zoom={13}
      style={{ height: '300px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <LocationMarker onLocationSelect={onLocationSelect} />
    </MapContainer>
  );
}
```

---

## 💰 Chi phí Google Maps

### Free Tier (Tháng đầu)
- $200 credit miễn phí
- Maps JavaScript API: $7/1000 loads
- Geocoding API: $5/1000 requests

### Ước tính
- 1000 người dùng/tháng × 2 lần mở modal = 2000 loads
- Chi phí: ~$14/tháng
- Với $200 credit → Miễn phí ~14 tháng

### Tối ưu chi phí
1. ✅ Cache kết quả geocoding
2. ✅ Lazy load map (chỉ load khi mở modal)
3. ✅ Giới hạn số lần request
4. ✅ Sử dụng Static Maps API cho preview (rẻ hơn)

---

## 🔒 Bảo mật

### 1. Restrict API Key
- ✅ Chỉ cho phép domain của bạn
- ✅ Giới hạn APIs được sử dụng
- ✅ Không commit API key vào Git

### 2. Rate Limiting
```tsx
// Giới hạn số lần click trên map
const [lastClickTime, setLastClickTime] = useState(0);

const handleMapClick = (e: google.maps.MapMouseEvent) => {
  const now = Date.now();
  if (now - lastClickTime < 1000) return; // 1 giây/click
  setLastClickTime(now);
  // ... xử lý click
};
```

### 3. Environment Variables
```bash
# .env.local (không commit)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key

# .env.example (commit)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 📝 Checklist triển khai

- [ ] Lấy Google Maps API Key
- [ ] Thêm API Key vào .env.local
- [ ] Cài đặt @react-google-maps/api
- [ ] Tạo GoogleMapPicker component
- [ ] Cập nhật LocationPickerModal
- [ ] Test trên localhost
- [ ] Restrict API Key cho production domain
- [ ] Deploy và test trên production
- [ ] Monitor usage trên Google Cloud Console

---

## 🐛 Troubleshooting

### Lỗi: "Google Maps JavaScript API error: RefererNotAllowedMapError"
**Giải pháp:** Thêm domain vào API Key restrictions

### Lỗi: Map không hiển thị
**Giải pháp:** 
1. Kiểm tra API Key có đúng không
2. Kiểm tra Maps JavaScript API đã enable chưa
3. Kiểm tra console có lỗi không

### Lỗi: "You have exceeded your request quota"
**Giải pháp:** 
1. Kiểm tra usage trên Google Cloud Console
2. Thêm billing account
3. Tối ưu số lần request

---

## 📚 Tài liệu tham khảo

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Docs](https://react-google-maps-api-docs.netlify.app/)
- [React Leaflet (OpenStreetMap)](https://react-leaflet.js.org/)
- [Google Maps Pricing](https://mapsplatform.google.com/pricing/)

---

**Lưu ý:** Hiện tại LocationPickerModal đang dùng placeholder. Sau khi tích hợp Google Maps theo hướng dẫn trên, bản đồ sẽ hoạt động đầy đủ.

**Ngày tạo:** 2026-04-22  
**Tác giả:** Kiro AI Assistant
