import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { calculateRoute } from "../../api/locationApi";

const pickupIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#16a34a;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const dropIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#dc2626;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const isCoordinate = (value) => value !== null && value !== undefined && value !== "";

export default function DeliveryNavigationCard({
  fromLat,
  fromLng,
  toLat,
  toLng,
  fromName,
  toName,
  title = "Navigation",
}) {
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const hasCoordinates =
    isCoordinate(fromLat) && isCoordinate(fromLng) && isCoordinate(toLat) && isCoordinate(toLng);

  const points = useMemo(
    () =>
      hasCoordinates
        ? {
            from: [parseFloat(fromLat), parseFloat(fromLng)],
            to: [parseFloat(toLat), parseFloat(toLng)],
          }
        : null,
    [fromLat, fromLng, hasCoordinates, toLat, toLng]
  );

  useEffect(() => {
    if (!hasCoordinates) return undefined;
    let cancelled = false;
    setLoadingRoute(true);
    calculateRoute(fromLat, fromLng, toLat, toLng)
      .then((res) => {
        if (cancelled) return;
        setRouteInfo(res.data);
        if (res.data.geometry?.coordinates) {
          setRouteCoords(res.data.geometry.coordinates.map((coord) => [coord[1], coord[0]]));
        }
      })
      .catch(() => {
        if (!cancelled) setRouteCoords(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLng, hasCoordinates, toLat, toLng]);

  const openGoogleMaps = () => {
    if (!hasCoordinates) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const center = points
    ? [(points.from[0] + points.to[0]) / 2, (points.from[1] + points.to[1]) / 2]
    : [20.5937, 78.9629];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <MapPinned className="h-4 w-4 text-orange-500" />
            {title}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {fromName || "Pickup"} to {toName || "Drop"}
          </p>
        </div>
        {routeInfo && (
          <div className="flex shrink-0 flex-col items-end text-xs font-semibold text-gray-500">
            <span className="text-blue-600">{routeInfo.distanceKm} km</span>
            <span>{routeInfo.durationMin} min</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-semibold text-green-700">{fromName || "Pickup"}</p>
          <div className="my-2 h-5 w-px bg-gray-300" />
          <p className="font-semibold text-red-700">{toName || "Drop"}</p>
        </div>
      </div>

      {hasCoordinates && points && (
        <div style={{ height: "min(300px, 50vw)", minHeight: 180 }}>
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="(c) OpenStreetMap"
            />
            <Marker position={points.from} icon={pickupIcon}>
              <Popup>Pickup: {fromName || "Pickup"}</Popup>
            </Marker>
            <Marker position={points.to} icon={dropIcon}>
              <Popup>Drop: {toName || "Drop"}</Popup>
            </Marker>
            <Polyline
              positions={routeCoords || [points.from, points.to]}
              pathOptions={{
                color: "#f97316",
                weight: routeCoords ? 4 : 3,
                opacity: routeCoords ? 0.8 : 0.55,
                dashArray: routeCoords ? undefined : "8 6",
              }}
            />
          </MapContainer>
        </div>
      )}

      <div className="p-4 pt-3">
        {hasCoordinates ? (
          <button
            type="button"
            onClick={openGoogleMaps}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600"
          >
            <ExternalLink className="h-4 w-4" />
            {loadingRoute ? "Loading route..." : "Open Navigation"}
          </button>
        ) : (
          <p className="text-center text-xs text-gray-400">Add coordinates to enable navigation.</p>
        )}
      </div>
    </div>
  );
}
