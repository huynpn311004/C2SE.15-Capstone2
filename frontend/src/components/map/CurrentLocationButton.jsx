import { useState } from 'react';

/**
 * CurrentLocationButton - Get user's current location using browser geolocation
 */
export default function CurrentLocationButton({ onLocationGet }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Get current position using navigator.geolocation
   */
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLoading(false);
        onLocationGet(location);
      },
      (err) => {
        setLoading(false);
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Bạn đã từ chối quyền truy cập vị trí');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Không thể xác định vị trí');
            break;
          case err.TIMEOUT:
            setError('Hết thời gian chờ');
            break;
          default:
            setError('Lỗi khi lấy vị trí');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="osm-current-location">
      <button
        type="button"
        className="osm-current-location-btn"
        onClick={handleGetCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="btn-spinner"></div>
            <span>Đang lấy vị trí...</span>
          </>
        ) : (
          <>
            <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <span>Vị trí của tôi</span>
          </>
        )}
      </button>
      {error && <p className="osm-location-error">{error}</p>}
    </div>
  );
}
