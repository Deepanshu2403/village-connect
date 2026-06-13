import { useCallback, useEffect, useRef, useState } from "react";
import { Compass, Landmark, Loader2, MapPin, X } from "lucide-react";
import API from "../../api/client";

const LANDMARKS = [
  "Bus Stand",
  "Main Chowk",
  "Panchayat Bhawan",
  "Government School",
  "Primary Health Center",
  "Milk Dairy",
  "Mandi",
  "Gurudwara",
  "Temple",
  "Railway Station",
  "Post Office",
  "Hospital",
];

const searchCache = new Map();

export default function LocationSearch({
  label,
  placeholder = "Enter village, town or landmark",
  value,
  onChange,
  onCoordinatesChange,
  showCurrentLocation = true,
  required = false,
}) {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

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

  const searchPlaces = useCallback(async (nextQuery) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (searchCache.has(cacheKey)) {
      setResults(searchCache.get(cacheKey));
      setShowDropdown(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await API.get("/travel/search-places", {
        params: { q: trimmed },
        timeout: 8000,
      });
      const items = res.data.results || [];
      searchCache.set(cacheKey, items);
      setResults(items);
      setShowDropdown(true);
    } catch {
      setError("Search failed. Please type the location manually.");
      setResults([]);
      setShowDropdown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (nextValue) => {
    setQuery(nextValue);
    setError("");
    onChange?.({ name: nextValue, lat: null, lng: null });

    window.clearTimeout(debounceRef.current);
    if (nextValue.length < 2) {
      setResults([]);
      setShowDropdown(nextValue.length > 0);
      return;
    }

    debounceRef.current = window.setTimeout(() => searchPlaces(nextValue), 500);
  };

  const handleSelect = (place) => {
    const displayValue = place.displayName || place.name;
    const nextLocation = {
      name: displayValue,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
    };

    setQuery(displayValue);
    setResults([]);
    setShowDropdown(false);
    setError("");
    onChange?.(nextLocation);
    if (nextLocation.lat && nextLocation.lng) {
      onCoordinatesChange?.(nextLocation);
    }
  };

  const handleLandmarkSelect = (landmark) => {
    const nextValue = query.length > 1 ? `${landmark}, ${query}` : landmark;
    setQuery(nextValue);
    setResults([]);
    setShowDropdown(false);
    setError("");
    onChange?.({ name: nextValue, lat: null, lng: null });
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }

    setDetectingLocation(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await API.get("/travel/reverse-geocode", {
            params: { lat, lng },
            timeout: 8000,
          });
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
      () => {
        setError("Location access denied. Please type the location.");
        setDetectingLocation(false);
      },
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const landmarkSuggestions =
    query.length >= 1
      ? LANDMARKS.filter((item) => item.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
      : [];
  const showAnyDropdown =
    showDropdown && (results.length > 0 || landmarkSuggestions.length > 0 || loading || error);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => handleInput(event.target.value)}
            onFocus={() => query.length >= 1 && setShowDropdown(true)}
            placeholder={placeholder}
            className="min-h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 pr-10 text-sm text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />
          )}
          {!loading && query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setShowDropdown(false);
                setError("");
                onChange?.({ name: "", lat: null, lng: null });
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear location"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showCurrentLocation && (
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={detectingLocation}
            className="inline-flex min-h-12 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
            title="Use current location"
          >
            {detectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Compass className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{detectingLocation ? "Detecting" : "Now"}</span>
          </button>
        )}
      </div>

      {showAnyDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              Searching locations...
            </div>
          )}

          {error && !loading && (
            <p className="px-3 py-3 text-sm font-semibold text-red-600">{error}</p>
          )}

          {landmarkSuggestions.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                Landmarks
              </p>
              {landmarkSuggestions.map((landmark) => (
                <button
                  key={landmark}
                  type="button"
                  onMouseDown={() => handleLandmarkSelect(landmark)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-orange-50"
                >
                  <Landmark className="h-4 w-4 flex-shrink-0 text-orange-400" />
                  <span className="font-semibold text-gray-900">{landmark}</span>
                  {query.length > 1 && <span className="truncate text-xs text-gray-400">{query}</span>}
                </button>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div>
              {landmarkSuggestions.length > 0 && (
                <p className="border-t border-gray-100 px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Search Results
                </p>
              )}
              {results.map((place, index) => (
                <button
                  key={`${place.fullAddress || place.displayName}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelect(place)}
                  className="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-3 text-left text-sm transition last:border-0 hover:bg-orange-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900">
                      {place.displayName || place.name}
                    </span>
                    {place.context && (
                      <span className="mt-0.5 block truncate text-xs text-gray-400">
                        {place.context}
                      </span>
                    )}
                    {!place.context && place.fullAddress && (
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
