import { Loader2, MapPin } from "lucide-react";

export default function LocationDisplay({
  location,
  locationName,
  loading,
  permissionDenied,
  onRequestPermission,
  compact = false,
}) {
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "rounded-xl border border-gray-200 bg-white px-4 py-3"}`}>
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-orange-500" />
        <span className="text-sm text-gray-500">Detecting location...</span>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3"}`}>
        <MapPin className="h-4 w-4 flex-shrink-0 text-yellow-500" />
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-yellow-700`}>
            Location access denied
          </p>
          {!compact && (
            <p className="mt-0.5 text-xs text-yellow-600">
              Enable it in browser settings for nearby results.
            </p>
          )}
        </div>
        {onRequestPermission && !compact && (
          <button
            type="button"
            onClick={onRequestPermission}
            className="flex-shrink-0 text-xs font-bold text-orange-500 hover:text-orange-600"
          >
            Enable
          </button>
        )}
      </div>
    );
  }

  if (!location) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"}`}>
        <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span className={`${compact ? "text-xs" : "text-sm"} text-gray-500`}>
          Location unavailable
        </span>
      </div>
    );
  }

  const displayName = locationName || "Location detected";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
        <span className="max-w-[120px] truncate text-xs font-semibold text-gray-700">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
        <MapPin className="h-4 w-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-400">Your location</p>
        <p className="truncate text-sm font-bold text-gray-900">{displayName}</p>
      </div>
    </div>
  );
}
