import { useEffect, useRef, useState } from "react";
import { Compass, Landmark, Loader2, MapPin } from "lucide-react";
import { reverseGeocode, searchPlaces } from "../../api/locationApi";

const RURAL_LANDMARKS = [
  "Bus Stand",
  "Main Chowk",
  "Panchayat Bhawan",
  "Government School",
  "Primary Health Center",
  "Milk Dairy",
  "Mandi",
  "Gurudwara",
  "Temple",
  "Mosque",
  "Railway Station",
  "Post Office",
];

export default function LocationSearch({
  label,
  placeholder = "Enter location",
  value,
  onChange,
  onCoordinatesChange,
  showCurrentLocation = true,
}) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value?.name || "");
  }, [value?.name]);

  useEffect(() => {
    const handleClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  const handleInput = (nextValue) => {
    setQuery(nextValue);
    onChange?.({ name: nextValue, lat: null, lng: null });

    window.clearTimeout(debounceRef.current);
    if (nextValue.length < 2) {
      setResults([]);
      setShowDropdown(nextValue.length > 0);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlaces(nextValue);
        setResults(res.data.results || []);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (place) => {
    const displayValue = place.displayName || place.name;
    setQuery(displayValue);
    setShowDropdown(false);
    const nextLocation = {
      name: displayValue,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    };
    onChange?.(nextLocation);
    onCoordinatesChange?.(nextLocation);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await reverseGeocode(lat, lng);
          const name = res.data.placeName || "Current Location";
          const nextLocation = { name, lat, lng };
          setQuery(name);
          onChange?.(nextLocation);
          onCoordinatesChange?.(nextLocation);
        } catch {
          const nextLocation = { name: "Current Location", lat, lng };
          setQuery(nextLocation.name);
          onChange?.(nextLocation);
          onCoordinatesChange?.(nextLocation);
        } finally {
          setDetectingLocation(false);
        }
      },
      () => setDetectingLocation(false),
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    );
  };

  const landmarkSuggestions =
    query.length > 0
      ? RURAL_LANDMARKS.filter((item) =>
          item.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3)
      : [];

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-gray-700">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(event) => handleInput(event.target.value)}
            onFocus={() => query.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />
          )}
        </div>
        {showCurrentLocation && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={detectingLocation}
            className="flex-shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-60"
            title="Use current location"
          >
            {detectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Compass className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {detectingLocation ? "Detecting..." : "Now"}
            </span>
          </button>
        )}
      </div>

      {showDropdown && (results.length > 0 || landmarkSuggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {landmarkSuggestions.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Landmarks
              </p>
              {landmarkSuggestions.map((landmark) => (
                <button
                  key={landmark}
                  type="button"
                  onMouseDown={() =>
                    handleSelect({
                      name: `${landmark}, ${query}`,
                      lat: null,
                      lng: null,
                    })
                  }
                  className="w-full gap-2 px-3 py-2.5 text-left text-sm hover:bg-orange-50"
                >
                  <Landmark className="h-4 w-4 flex-shrink-0 text-orange-400" />
                  <span className="font-medium text-gray-800">{landmark}</span>
                  <span className="ml-1 text-xs text-gray-400">{query}</span>
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div>
              {landmarkSuggestions.length > 0 && (
                <p className="border-t border-gray-100 px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Search Results
                </p>
              )}
              {results.map((place, index) => (
                <button
                  key={`${place.fullAddress}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelect(place)}
                  className="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-3 text-left text-sm transition-colors last:border-0 hover:bg-orange-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900">{place.name}</span>
                    {(place.context || place.shortAddress) && (
                      <span className="mt-0.5 block truncate text-xs text-gray-400">
                        {place.context || place.shortAddress}
                      </span>
                    )}
                    {!place.context && !place.shortAddress && place.fullAddress && (
                      <span className="mt-0.5 line-clamp-1 block text-xs text-gray-400">
                        {place.fullAddress}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
