import { useState, useRef, useEffect } from 'react';

/**
 * SearchBox - Search address using Nominatim OpenStreetMap API
 * Provides address search with autocomplete-style results
 */
export default function SearchBox({ onSearch, onLocationSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Search address using Nominatim API
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setShowResults(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      if (data.length === 0) {
        setError('Không tìm thấy địa chỉ');
        setResults([]);
      } else {
        setResults(data);
        setError('');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Lỗi tìm kiếm. Vui lòng thử lại.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select a search result
   */
  const handleSelectResult = (result) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
    };

    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);

    // Notify parent component
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  return (
    <div className="osm-search-box" ref={searchRef}>
      <form onSubmit={handleSearch} className="osm-search-form">
        <div className="osm-search-input-wrapper">
          <svg className="osm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm địa chỉ..."
            className="osm-search-input"
            autoComplete="off"
          />
          {loading && (
            <div className="osm-search-spinner">
              <div className="spinner"></div>
            </div>
          )}
        </div>
        <button type="submit" className="osm-search-btn" disabled={loading}>
          Tìm
        </button>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="osm-search-results">
          {error && (
            <div className="osm-search-error">{error}</div>
          )}
          {results.map((result, index) => (
            <button
              key={index}
              type="button"
              className="osm-search-result-item"
              onClick={() => handleSelectResult(result)}
            >
              <svg className="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="result-text">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
