import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationModal.css';

// Custom marker icon
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * Fly to location when position changes
 */
function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

/**
 * Handle map clicks
 */
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

/**
 * Single marker component
 */
function SelectedMarker({ position, address }) {
  if (!position) return null;
  return (
    <Marker position={[position.lat, position.lng]} icon={markerIcon}>
      <Popup className="custom-popup">
        <div className="popup-content">
          <div className="popup-row">
            <span className="popup-label">Tọa độ:</span>
            <span className="popup-value">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </span>
          </div>
          {address && (
            <div className="popup-row popup-address">
              <span className="popup-label">Địa chỉ:</span>
              <span className="popup-value">{address}</span>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

/**
 * Search address using Nominatim
 */
function SearchBox({ onLocationSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setShow(true);
    try {
      // Add "Vietnam" to search query to prioritize Vietnamese addresses
      const searchQuery = `${query.trim()}, Vietnam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=vn`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (data.length === 0) {
        setError('Không tìm thấy địa chỉ trong Việt Nam');
        setResults([]);
      } else {
        setResults(data);
      }
    } catch {
      setError('Lỗi tìm kiếm');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const select = (r) => {
    onLocationSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name });
    setQuery(r.display_name);
    setShow(false);
  };

  return (
    <div className="osm-search-box" ref={ref}>
      <form onSubmit={search} className="osm-search-form">
        <div className="osm-search-input-wrapper">
          <svg className="osm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm địa chỉ..."
            className="osm-search-input"
            autoComplete="off"
          />
          {loading && <div className="osm-search-spinner"><div className="spinner" /></div>}
        </div>
        <button type="submit" className="osm-search-btn" disabled={loading}>Tìm</button>
      </form>
      {show && (
        <div className="osm-search-results">
          {error && <div className="osm-search-error">{error}</div>}
          {results.map((r, i) => (
            <button key={i} type="button" className="osm-search-result-item" onClick={() => select(r)}>
              <svg className="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <span className="result-text">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Get current location
 */
function CurrentLocationButton({ onLocationGet }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const get = () => {
    if (!navigator.geolocation) { setError('Trình duyệt không hỗ trợ'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (p) => { onLocationGet({ lat: p.coords.latitude, lng: p.coords.longitude }); setLoading(false); },
      (e) => {
        setLoading(false);
        setError(e.code === 1 ? 'Từ chối quyền truy cập' : 'Không xác định được vị trí');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="osm-current-location">
      <button type="button" className="osm-current-location-btn" onClick={get} disabled={loading}>
        {loading ? (
          <><div className="btn-spinner" /><span>Đang lấy...</span></>
        ) : (
          <><svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg><span>Vị trí của tôi</span></>
        )}
      </button>
      {error && <p className="osm-location-error">{error}</p>}
    </div>
  );
}

// Vietnam bounds
const VIETNAM_BOUNDS = {
  minLat: 8.4,
  maxLat: 23.4,
  minLng: 102.1,
  maxLng: 109.5,
};

function isInVietnam(lat, lng) {
  return lat >= VIETNAM_BOUNDS.minLat && lat <= VIETNAM_BOUNDS.maxLat &&
         lng >= VIETNAM_BOUNDS.minLng && lng <= VIETNAM_BOUNDS.maxLng;
}

/**
 * LocationModal - Main component
 */
export default function LocationModal({ isOpen, onClose, onSelectLocation, initialAddress = '' }) {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPosition(null);
      setSelectedAddress(initialAddress || '');
      setMapKey(prev => prev + 1);
    }
  }, [isOpen, initialAddress]);

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (lat, lng, setAddr) => {
    if (!isInVietnam(lat, lng)) {
      setAddr('⚠️ Vị trí không nằm trong Việt Nam');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      setAddr(data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setAddr(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMapClick = useCallback((latlng) => {
    if (!isInVietnam(latlng.lat, latlng.lng)) {
      alert('Chỉ được chọn vị trí trong Việt Nam!');
      return;
    }
    setSelectedPosition({ lat: latlng.lat, lng: latlng.lng });
    reverseGeocode(latlng.lat, latlng.lng, setSelectedAddress);
  }, [reverseGeocode]);

  const handleSearchSelect = useCallback((loc) => {
    if (!isInVietnam(loc.lat, loc.lng)) {
      alert('Kết quả tìm kiếm không nằm trong Việt Nam!');
      return;
    }
    setSelectedPosition({ lat: loc.lat, lng: loc.lng });
    setSelectedAddress(loc.address);
  }, []);

  const handleCurrentLocation = useCallback((loc) => {
    if (!isInVietnam(loc.lat, loc.lng)) {
      alert('Vị trí hiện tại không nằm trong Việt Nam!');
      return;
    }
    setSelectedPosition({ lat: loc.lat, lng: loc.lng });
    reverseGeocode(loc.lat, loc.lng, setSelectedAddress);
  }, [reverseGeocode]);

  const handleConfirm = () => {
    if (!selectedPosition) return;
    onSelectLocation({ lat: selectedPosition.lat, lng: selectedPosition.lng, address: selectedAddress });
    onClose();
  };

  // Escape to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="osm-modal-overlay" onClick={onClose}>
      <div className="osm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="osm-modal-header">
          <h3 className="osm-modal-title">Chọn vị trí giao hàng</h3>
          <button className="osm-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="osm-modal-toolbar">
          <SearchBox onLocationSelect={handleSearchSelect} />
          <CurrentLocationButton onLocationGet={handleCurrentLocation} />
        </div>

        {/* Map - KEY ensures complete remount */}
        <div className="osm-modal-map">
          <MapContainer
            key={mapKey}
            center={[15.5735, 108.4743]}
            zoom={14}
            className="osm-map-container"
            zoomControl={true}
            scrollWheelZoom={true}
            maxBounds={[[8.4, 102.1], [23.4, 109.5]]}
            maxBoundsViscosity={0.8}
            minZoom={6}
            maxZoom={18}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleMapClick} />
            {selectedPosition && <FlyTo position={selectedPosition} />}
            <SelectedMarker position={selectedPosition} address={selectedAddress} />
          </MapContainer>

          {loading && (
            <div className="osm-map-loading">
              <div className="spinner-large" />
              <p>Đang xử lý...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="osm-modal-footer">
          {selectedPosition ? (
            <div className="osm-selected-info">
              <div className="osm-selected-coords">
                <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span>{selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}</span>
              </div>
              <div className="osm-selected-address">{selectedAddress}</div>
            </div>
          ) : (
            <div className="osm-no-selection">
              <p>Nhấn vào bản đồ hoặc tìm kiếm địa chỉ để chọn vị trí</p>
            </div>
          )}
          <div className="osm-modal-actions">
            <button className="osm-btn-cancel" onClick={onClose}>Hủy</button>
            <button className="osm-btn-confirm" onClick={handleConfirm} disabled={!selectedPosition}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Xác nhận vị trí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
