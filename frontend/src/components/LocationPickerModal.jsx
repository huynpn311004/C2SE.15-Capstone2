import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LocationPickerModal.css';

const LocationPickerModal = ({ isOpen, onClose, onSelectLocation, initialAddress = '' }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  const [searchInput, setSearchInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default to Vietnam
  const DEFAULT_CENTER = { lat: 10.8231, lng: 106.6297 }; // Ho Chi Minh City

  // Load Google Maps script
  useEffect(() => {
    if (!isOpen) return;

    const loadGoogleMaps = () => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    // Support both VITE_ and REACT_APP_ prefixes for compatibility
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      || import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY
      || '';

    if (!apiKey) {
      setError(
        'Google Maps API Key chưa được cấu hình. Vui lòng thêm VITE_GOOGLE_MAPS_API_KEY vào file .env của bạn.'
      );
      setMapLoaded(false); // Ensure map doesn't try to load
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMapScript`;
      script.async = true;
      script.defer = true;

      window.initMapScript = () => {
        setMapLoaded(true);
        delete window.initMapScript;
      };

      script.onerror = () => {
        setError('Không thể tải Google Maps. Vui lòng kiểm tra API key.');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [isOpen]);

  // Initialize map when loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const initMap = () => {
      const map = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();

      // Click on map to select location
      map.addListener('click', (e) => {
        const location = e.latLng;
        handleLocationSelect(location);
      });
    };

    initMap();
  }, [mapLoaded]);

  const handleLocationSelect = useCallback((location, address = '') => {
    const newLocation = {
      lat: location.lat(),
      lng: location.lng()
    };
    setSelectedLocation(newLocation);

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add new marker
    if (mapInstanceRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: location,
        map: mapInstanceRef.current,
        animation: window.google.maps.Animation.DROP,
        title: 'Vị trí giao hàng'
      });
    }

    if (address) {
      setSelectedAddress(address);
      return;
    }

    // Reverse geocode if no address provided
    if (geocoderRef.current) {
      geocoderRef.current.geocode({ location }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setSelectedAddress(results[0].formatted_address);
        } else {
          setSelectedAddress(`${location.lat().toFixed(6)}, ${location.lng().toFixed(6)}`);
        }
      });
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim() || !geocoderRef.current) return;

    setLoading(true);
    geocoderRef.current.geocode({ address: searchInput }, (results, status) => {
      setLoading(false);
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(location);
          mapInstanceRef.current.setZoom(16);
        }
        handleLocationSelect(location, results[0].formatted_address);
      } else {
        setError('Không tìm thấy địa chỉ này');
        setTimeout(() => setError(''), 3000);
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt không hỗ trợ định vị');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setSelectedLocation(location);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(location);
          mapInstanceRef.current.setZoom(16);
        }

        if (geocoderRef.current) {
          geocoderRef.current.geocode({ location }, (results, status) => {
            setLoading(false);
            if (status === 'OK' && results[0]) {
              setSelectedAddress(results[0].formatted_address);
            } else {
              setSelectedAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
            }
          });
        } else {
          setLoading(false);
          setSelectedAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        }
      },
      (err) => {
        setLoading(false);
        setError('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền truy cập.');
        setTimeout(() => setError(''), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      setError('Vui lòng chọn một vị trí trên bản đồ');
      setTimeout(() => setError(''), 3000);
      return;
    }
    onSelectLocation({
      address: selectedAddress,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="location-picker-overlay" onClick={onClose}>
      <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-picker-header">
          <h3>Chọn vị trí giao hàng</h3>
          <button className="location-picker-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="location-picker-search">
          <form onSubmit={handleSearch} className="location-picker-search-form">
            <input
              type="text"
              placeholder="Tìm kiếm địa chỉ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="location-picker-search-input"
            />
            <button type="submit" className="location-picker-search-btn" disabled={loading}>
              {loading ? '...' : 'Tìm'}
            </button>
          </form>
          <button
            type="button"
            className="location-picker-current-location"
            onClick={handleGetCurrentLocation}
            disabled={loading}
          >
            <span className="location-picker-icon">📍</span>
            Vị trí hiện tại
          </button>
        </div>

        {error && <div className="location-picker-error">{error}</div>}

        <div className="location-picker-map-container">
          {!mapLoaded ? (
            <div className="location-picker-loading">
              <div className="location-picker-spinner"></div>
              <p>Đang tải bản đồ...</p>
            </div>
          ) : (
            <div ref={mapRef} className="location-picker-map" />
          )}
        </div>

        <div className="location-picker-instructions">
          <p>
            <span className="location-picker-icon">👆</span>
            Nhấn vào bản đồ để chọn vị trí hoặc tìm kiếm địa chỉ
          </p>
        </div>

        {selectedLocation && (
          <div className="location-picker-selected">
            <div className="location-picker-selected-info">
              <span className="location-picker-icon">✓</span>
              <div>
                <p className="location-picker-selected-label">Địa chỉ đã chọn:</p>
                <p className="location-picker-selected-address">{selectedAddress}</p>
              </div>
            </div>
            <div className="location-picker-selected-coords">
              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </div>
          </div>
        )}

        <div className="location-picker-actions">
          <button className="location-picker-cancel" onClick={onClose}>
            Hủy
          </button>
          <button
            className="location-picker-confirm"
            onClick={handleConfirm}
            disabled={!selectedLocation}
          >
            Xác nhận vị trí
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
