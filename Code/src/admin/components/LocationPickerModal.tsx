'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import để tránh SSR issues với Leaflet
const LeafletMap = dynamic(
  () => import('./LeafletMap').then((mod) => mod.LeafletMap),
  { 
    ssr: false,
    loading: () => (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: 8 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading map...</span>
        </div>
      </div>
    )
  }
);

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  currentLocation?: string;
}

const LOCATIONS = [
  {
    category: 'Nội Thất Minh Quân',
    icon: '🏢',
    color: 'primary',
    items: [
      { name: 'Nội Thất Minh Quân - TP. Hồ Chí Minh', coords: '10.8231° N, 106.6297° E' },
      { name: 'Xưởng Nội Thất Minh Quân - Quận 12, TPHCM', coords: '10.8526° N, 106.6177° E' },
      { name: 'Showroom Nội Thất Minh Quân - Quận 1, TPHCM', coords: '10.7769° N, 106.7009° E' },
      { name: 'Chi nhánh Nội Thất Minh Quân - Bình Dương', coords: '10.9804° N, 106.6519° E' },
    ]
  },
  {
    category: 'Thành phố lớn',
    icon: '🏙️',
    color: 'secondary',
    items: [
      { name: 'TP. Hồ Chí Minh, Việt Nam', coords: '10.8231° N, 106.6297° E' },
      { name: 'Hà Nội, Việt Nam', coords: '21.0285° N, 105.8542° E' },
      { name: 'Đà Nẵng, Việt Nam', coords: '16.0544° N, 108.2022° E' },
      { name: 'Cần Thơ, Việt Nam', coords: '10.0452° N, 105.7469° E' },
      { name: 'Biên Hòa, Đồng Nai', coords: '10.9510° N, 106.8234° E' },
      { name: 'Nha Trang, Khánh Hòa', coords: '12.2388° N, 109.1967° E' },
      { name: 'Huế, Thừa Thiên Huế', coords: '16.4637° N, 107.5909° E' },
      { name: 'Vũng Tàu, Bà Rịa - Vũng Tàu', coords: '10.3460° N, 107.0843° E' },
    ]
  },
  {
    category: 'Khu vực TPHCM',
    icon: '📍',
    color: 'info',
    items: [
      { name: 'Quận 1, TP. Hồ Chí Minh', coords: '10.7769° N, 106.7009° E' },
      { name: 'Quận 3, TP. Hồ Chí Minh', coords: '10.7829° N, 106.6920° E' },
      { name: 'Quận 7, TP. Hồ Chí Minh', coords: '10.7333° N, 106.7196° E' },
      { name: 'Quận 12, TP. Hồ Chí Minh', coords: '10.8526° N, 106.6177° E' },
      { name: 'Thủ Đức, TP. Hồ Chí Minh', coords: '10.8509° N, 106.7717° E' },
      { name: 'Bình Thạnh, TP. Hồ Chí Minh', coords: '10.8014° N, 106.7147° E' },
      { name: 'Tân Bình, TP. Hồ Chí Minh', coords: '10.7992° N, 106.6528° E' },
      { name: 'Gò Vấp, TP. Hồ Chí Minh', coords: '10.8376° N, 106.6717° E' },
    ]
  }
];

export function LocationPickerModal({ isOpen, onClose, onSelect, currentLocation }: LocationPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || '');
  const [mapCenter, setMapCenter] = useState<[number, number]>([10.8231, 106.6297]);

  useEffect(() => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
      // Parse coordinates nếu có
      const location = LOCATIONS.flatMap(cat => cat.items).find(item => item.name === currentLocation);
      if (location) {
        const coords = parseCoordinates(location.coords);
        if (coords) {
          setMapCenter(coords);
        }
      }
    }
  }, [currentLocation]);

  if (!isOpen) return null;

  const filteredLocations = LOCATIONS.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  function parseCoordinates(coordsStr: string): [number, number] | null {
    const match = coordsStr.match(/(\d+\.\d+)°\s*N,\s*(\d+\.\d+)°\s*E/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
  }

  function handleSelect() {
    if (selectedLocation) {
      onSelect(selectedLocation);
    }
  }

  function handleLocationClick(item: { name: string; coords: string }) {
    setSelectedLocation(item.name);
    const coords = parseCoordinates(item.coords);
    if (coords) {
      setMapCenter(coords);
    }
  }

  function handleMapLocationSelect(location: { lat: number; lng: number; address: string }) {
    setSelectedLocation(location.address);
  }

  return (
    <div 
      className="modal show d-block" 
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div 
        className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-map me-2"></i>
              Chọn vị trí từ bản đồ
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {/* Search */}
            <div className="mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Tìm kiếm vị trí..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Real Map with Leaflet */}
            <LeafletMap
              center={mapCenter}
              zoom={13}
              onLocationSelect={handleMapLocationSelect}
              selectedLocation={selectedLocation}
            />

            {/* Location List */}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {filteredLocations.map((category, idx) => (
                <div key={idx} className="mb-3">
                  <h6 className="text-muted small mb-2">
                    <span className="me-2">{category.icon}</span>
                    {category.category}
                  </h6>
                  <div className="list-group">
                    {category.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        type="button"
                        className={`list-group-item list-group-item-action ${selectedLocation === item.name ? 'active' : ''}`}
                        onClick={() => handleLocationClick(item)}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-semibold">{item.name}</div>
                            <small className={selectedLocation === item.name ? 'text-white-50' : 'text-muted'}>
                              <i className="bi bi-geo-alt me-1"></i>
                              {item.coords}
                            </small>
                          </div>
                          {selectedLocation === item.name && (
                            <i className="bi bi-check-circle-fill text-white"></i>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {searchTerm && filteredLocations.length === 0 && (
              <div className="text-center text-muted py-4">
                <i className="bi bi-search" style={{ fontSize: 32 }}></i>
                <div className="mt-2">Không tìm thấy vị trí phù hợp</div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSelect}
              disabled={!selectedLocation}
            >
              <i className="bi bi-check-lg me-2"></i>
              Chọn vị trí này
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translate(-50%, -100%); }
          50% { transform: translate(-50%, -110%); }
        }
      `}</style>
    </div>
  );
}
