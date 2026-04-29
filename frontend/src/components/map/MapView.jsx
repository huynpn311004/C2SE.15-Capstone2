import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import LocationMarker from './LocationMarker';
import 'leaflet/dist/leaflet.css';

/**
 * MapView - Main map component using OpenStreetMap tiles
 * Default center: Quảng Nam, Vietnam
 */
export default function MapView({ center, zoom, children, id }) {
  // Default center: Tam Kỳ, Quảng Nam, Vietnam
  const defaultCenter = center || { lat: 15.5735, lng: 108.4743 };
  const defaultZoom = zoom || 14;

  return (
    <MapContainer
      center={[defaultCenter.lat, defaultCenter.lng]}
      zoom={defaultZoom}
      className="osm-map-container"
      zoomControl={true}
      scrollWheelZoom={true}
      id={id}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
