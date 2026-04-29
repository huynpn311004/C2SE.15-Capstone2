import { Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * Custom marker icon using Leaflet's built-in default marker
 * Fix for leaflet default marker icon in React
 */
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

/**
 * LocationMarker - Handles map click events and marker display
 * Uses useMapEvents to capture clicks on the map
 */
export default function LocationMarker({ position, address, onLocationSelect }) {
  // Listen for map click events
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng);
      }
    },
  });

  if (!position) return null;

  return (
    <Marker position={[position.lat, position.lng]} icon={defaultIcon}>
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
