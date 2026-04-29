/**
 * NearbyStoresMap - Component hiển thị cửa hàng gần vị trí user
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStoresWithLocation } from '../../services/locationApi';
import './NearbyStoresMap.css';

// Custom marker icons
const storeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Fly to location
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 15, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

// Distance filter options
const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 15, label: '15 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
];

export default function NearbyStoresMap({
  userLat,
  userLng,
  selectedStoreId,
  onStoreSelect,
  showUserLocation = true,
  defaultRadius = 10,
}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(defaultRadius);
  const [mapKey, setMapKey] = useState(0);

  // Fetch stores when position or radius changes
  const fetchStores = useCallback(async () => {
    if (!userLat || !userLng) return;

    setLoading(true);
    setError('');
    try {
      const data = await getStoresWithLocation({
        lat: userLat,
        lng: userLng,
        radius_km: radius,
      });
      setStores(data || []);
    } catch (err) {
      setError('Không thể tải danh sách cửa hàng');
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng, radius]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Map center based on user position
  const mapCenter = useMemo(() => {
    if (userLat && userLng) {
      return [userLat, userLng];
    }
    return [15.5735, 108.4743]; // Default: Quang Nam
  }, [userLat, userLng]);

  // Trigger map remount when position changes
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [userLat, userLng]);

  return (
    <div className="nearby-stores-map">
      {/* Toolbar */}
      <div className="map-toolbar">
        <div className="radius-filter">
          <label>Bán kính:</label>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
            {RADIUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button className="refresh-btn" onClick={fetchStores} disabled={loading}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          Làm mới
        </button>
      </div>

      {/* Error message */}
      {error && <div className="map-error">{error}</div>}

      {/* Loading indicator */}
      {loading && (
        <div className="map-loading">
          <div className="spinner" />
          <span>Đang tải cửa hàng...</span>
        </div>
      )}

      {/* Map */}
      <div className="map-container">
        <MapContainer
          key={mapKey}
          center={mapCenter}
          zoom={14}
          className="nearby-map-container"
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

          {/* User location marker */}
          {showUserLocation && userLat && userLng && (
            <>
              <Marker position={[userLat, userLng]} icon={userIcon}>
                <Popup>
                  <div className="popup-user">
                    <strong>Vị trí của bạn</strong>
                  </div>
                </Popup>
              </Marker>
              <FlyToLocation position={{ lat: userLat, lng: userLng }} />
            </>
          )}

          {/* Store markers */}
          {stores.map((store) => (
            <Marker
              key={store.id}
              position={[store.latitude, store.longitude]}
              icon={storeIcon}
              eventHandlers={{
                click: () => onStoreSelect?.(store),
              }}
            >
              <Popup>
                <div className="popup-store">
                  <h4>{store.name}</h4>
                  <p className="store-address">{store.address}</p>
                  {store.distance !== null && store.distance !== undefined && (
                    <p className="store-distance">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {store.distance} km
                    </p>
                  )}
                  {onStoreSelect && (
                    <button
                      className="popup-select-btn"
                      onClick={() => onStoreSelect(store)}
                    >
                      Chọn cửa hàng này
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Store list sidebar */}
      <div className="store-list">
        <h4>Cửa hàng gần đây ({stores.length})</h4>
        {stores.length === 0 && !loading && (
          <p className="no-stores">Không có cửa hàng trong bán kính {radius} km</p>
        )}
        {stores.map((store) => (
          <div
            key={store.id}
            className={`store-item ${selectedStoreId === store.id ? 'selected' : ''}`}
            onClick={() => {
              onStoreSelect?.(store);
              setMapKey(prev => prev + 1);
            }}
          >
            <div className="store-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="store-info">
              <h5>{store.name}</h5>
              <p className="store-address">{store.address}</p>
              {store.distance !== null && store.distance !== undefined && (
                <span className="store-distance-badge">{store.distance} km</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
