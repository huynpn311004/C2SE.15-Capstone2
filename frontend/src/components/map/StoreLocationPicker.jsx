/**
 * StoreLocationPicker - Component cho store owner chọn vị trí cửa hàng
 */
import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { updateStoreLocation, reverseGeocode } from '../../services/locationApi';
import './StoreLocationPicker.css';

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

// Fly to selected position
function FlyToPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

// Handle map clicks
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function StoreLocationPicker({
  storeId,
  initialLat,
  initialLng,
  initialAddress,
  onSave,
  onCancel,
}) {
  const [position, setPosition] = useState(
    initialLat && initialLng
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mapKey, setMapKey] = useState(0);

  // Vietnam bounds
  const vietnamBounds = [[8.4, 102.1], [23.4, 109.5]];

  // Reverse geocode helper
  const getAddress = useCallback(async (lat, lng) => {
    setLoading(true);
    setError('');
    try {
      const result = await reverseGeocode(lat, lng);
      setAddress(result.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (err) {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMapClick = useCallback((latlng) => {
    // Validate Vietnam bounds
    if (latlng.lat < 8.4 || latlng.lat > 23.4 || latlng.lng < 102.1 || latlng.lng > 109.5) {
      setError('Vị trí không nằm trong Việt Nam!');
      return;
    }
    setError('');
    setPosition({ lat: latlng.lat, lng: latlng.lng });
    getAddress(latlng.lat, latlng.lng);
  }, [getAddress]);

  const handleSave = async () => {
    if (!position) {
      setError('Vui lòng chọn vị trí trên bản đồ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateStoreLocation(storeId, position.lat, position.lng);
      if (onSave) {
        onSave({
          lat: position.lat,
          lng: position.lng,
          address,
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi khi lưu vị trí');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="store-location-picker">
      <div className="picker-header">
        <h3>Chọn vị trí cửa hàng</h3>
        <p className="picker-hint">Click vào bản đồ để chọn vị trí</p>
      </div>

      <div className="picker-map">
        <MapContainer
          key={mapKey}
          center={position ? [position.lat, position.lng] : [15.5735, 108.4743]}
          zoom={position ? 16 : 14}
          className="picker-map-container"
          zoomControl={true}
          scrollWheelZoom={true}
          maxBounds={vietnamBounds}
          maxBoundsViscosity={0.8}
          minZoom={6}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          {position && <FlyToPosition position={position} />}
          {position && (
            <Marker position={[position.lat, position.lng]} icon={markerIcon} />
          )}
        </MapContainer>

        {loading && (
          <div className="picker-loading">
            <div className="spinner" />
            <span>Đang lấy địa chỉ...</span>
          </div>
        )}
      </div>

      {error && <div className="picker-error">{error}</div>}

      <div className="picker-info">
        <div className="info-row">
          <span className="info-label">Tọa độ:</span>
          <span className="info-value">
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : 'Chưa chọn'}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Địa chỉ:</span>
          <span className="info-value address">{address || 'Chưa có địa chỉ'}</span>
        </div>
      </div>

      <div className="picker-actions">
        <button className="btn-cancel" onClick={onCancel} disabled={saving}>
          Hủy
        </button>
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={!position || saving}
        >
          {saving ? 'Đang lưu...' : 'Lưu vị trí'}
        </button>
      </div>
    </div>
  );
}
