import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

const INDIA = [20.5937, 78.9629];

const isCoord = (value) => Number.isFinite(Number(value));
const toPoint = (lat, lng) => (isCoord(lat) && isCoord(lng) ? [Number(lat), Number(lng)] : null);

const makeIcon = (color, pulse = false, size = 16) =>
  L.divIcon({
    className: "",
    html: pulse
      ? '<div class="driver-pulse"></div>'
      : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });

const ICONS = {
  driver: makeIcon("#f97316", true, 20),
  pickup: makeIcon("#16a34a", false, 14),
  drop: makeIcon("#dc2626", false, 14),
  user: makeIcon("#2563eb", false, 14),
};

function Recenter({ point, zoom = 14 }) {
  const map = useMap();
  const prevRef = useRef(null);

  useEffect(() => {
    if (!point) return;
    const [lat, lng] = point;
    const prev = prevRef.current;
    if (!prev || Math.abs(prev.lat - lat) > 0.0001 || Math.abs(prev.lng - lng) > 0.0001) {
      map.setView(point, zoom, { animate: true, duration: 0.8 });
      prevRef.current = { lat, lng };
    }
  }, [map, point, zoom]);

  return null;
}

export default function UnifiedTrackingMap({
  driverLocation = null,
  isStale = false,
  pickupLat = null,
  pickupLng = null,
  dropLat = null,
  dropLng = null,
  userLocation = null,
  pickupLabel = "Pickup",
  dropLabel = "Destination",
  driverLabel = "Driver",
  height = 280,
  showRadius = false,
  radiusKm = 10,
  interactive = true,
}) {
  const driverPoint = toPoint(driverLocation?.lat, driverLocation?.lng);
  const pickupPoint = toPoint(pickupLat, pickupLng);
  const dropPoint = toPoint(dropLat, dropLng);
  const userPoint = toPoint(userLocation?.lat, userLocation?.lng);
  const center = driverPoint || pickupPoint || userPoint || dropPoint || INDIA;
  const zoom = driverPoint || pickupPoint ? 13 : userPoint ? 11 : 5;

  const minutesAgo = useMemo(() => {
    if (!driverLocation?.updatedAt) return null;
    const updatedAt = new Date(driverLocation.updatedAt).getTime();
    if (Number.isNaN(updatedAt)) return null;
    return Math.max(0, Math.floor((Date.now() - updatedAt) / 60000));
  }, [driverLocation?.updatedAt]);

  return (
    <div className="w-full">
      <div
        className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={interactive}
          scrollWheelZoom={interactive}
          dragging={interactive}
          doubleClickZoom={interactive}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="OpenStreetMap"
          />

          {driverPoint && <Recenter point={driverPoint} zoom={14} />}

          {driverPoint && (
            <Marker position={driverPoint} icon={ICONS.driver}>
              <Popup>
                <div className="min-w-28">
                  <p className="m-0 text-sm font-bold text-orange-600">{driverLabel}</p>
                  {minutesAgo !== null && (
                    <p className="m-0 mt-1 text-xs text-gray-500">
                      Updated {minutesAgo === 0 ? "just now" : `${minutesAgo}m ago`}
                    </p>
                  )}
                  {isStale && <p className="m-0 mt-1 text-xs text-red-600">Location may be outdated</p>}
                </div>
              </Popup>
            </Marker>
          )}

          {pickupPoint && (
            <Marker position={pickupPoint} icon={ICONS.pickup}>
              <Popup>
                <p className="m-0 text-sm font-bold text-green-600">{pickupLabel}</p>
              </Popup>
            </Marker>
          )}

          {dropPoint && (
            <Marker position={dropPoint} icon={ICONS.drop}>
              <Popup>
                <p className="m-0 text-sm font-bold text-red-600">{dropLabel}</p>
              </Popup>
            </Marker>
          )}

          {userPoint && !driverPoint && (
            <Marker position={userPoint} icon={ICONS.user}>
              <Popup>
                <p className="m-0 text-sm font-bold text-blue-600">You are here</p>
              </Popup>
            </Marker>
          )}

          {showRadius && userPoint && (
            <Circle
              center={userPoint}
              radius={radiusKm * 1000}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#93c5fd",
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: "6 4",
              }}
            />
          )}

          {pickupPoint && dropPoint && (
            <Polyline
              positions={[pickupPoint, dropPoint]}
              pathOptions={{ color: "#f97316", weight: 3, opacity: 0.55, dashArray: "8 6" }}
            />
          )}

          {driverPoint && dropPoint && (
            <Polyline
              positions={[driverPoint, dropPoint]}
              pathOptions={{ color: isStale ? "#94a3b8" : "#2563eb", weight: 3, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex flex-wrap items-center gap-3">
          {driverPoint && <Legend color="#f97316" label="Driver" />}
          {pickupPoint && <Legend color="#16a34a" label="Pickup" />}
          {dropPoint && <Legend color="#dc2626" label="Destination" />}
        </div>
        {driverPoint && !isStale && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600 pulse-live" />
            Live
          </span>
        )}
        {isStale && <span className="text-xs font-bold text-red-600">Outdated</span>}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
