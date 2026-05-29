import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";

export default function LiveTripMap({
  driverLocation,
  isStale = false,
  fromLat,
  fromLng,
  toLat,
  toLng,
  height = 240,
}) {
  const driverPoint =
    driverLocation?.lat && driverLocation?.lng
      ? [Number(driverLocation.lat), Number(driverLocation.lng)]
      : null;
  const fromPoint = fromLat && fromLng ? [Number(fromLat), Number(fromLng)] : null;
  const toPoint = toLat && toLng ? [Number(toLat), Number(toLng)] : null;
  const center = driverPoint || fromPoint || toPoint || [20.5937, 78.9629];
  const routePoints = [driverPoint, toPoint].filter(Boolean);

  return (
    <div
      className="overflow-hidden rounded-xl border border-blue-100"
      style={{ height }}
    >
      <MapContainer center={center} zoom={driverPoint ? 13 : 6} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fromPoint && <Marker position={fromPoint} />}
        {toPoint && <Marker position={toPoint} />}
        {driverPoint && <Marker position={driverPoint} />}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: isStale ? "#94a3b8" : "#2563eb", weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
