import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { calculateRoute } from "../../api/locationApi";
import { requestRide } from "../../api/rideApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatShortDateTime } from "../../utils/format";

const INDIA_CENTER = [20.5937, 78.9629];

const markerIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const youIcon = markerIcon("#2563eb");
const availableIcon = markerIcon("#f97316");
const fullIcon = markerIcon("#6b7280");

export default function RideMap({
  rides = [],
  userLocation = null,
  requestedTripIds = new Set(),
  onRideBooked,
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [bookingId, setBookingId] = useState(null);
  const [routeGeometries, setRouteGeometries] = useState({});
  const center = userLocation ? [userLocation.lat, userLocation.lng] : INDIA_CENTER;

  useEffect(() => {
    let cancelled = false;

    rides.forEach(async (ride) => {
      const hasCoordinates =
        Number.isFinite(Number(ride.fromLat)) &&
        Number.isFinite(Number(ride.fromLng)) &&
        Number.isFinite(Number(ride.toLat)) &&
        Number.isFinite(Number(ride.toLng));

      if (!hasCoordinates) return;

      try {
        const res = await calculateRoute(
          ride.fromLat,
          ride.fromLng,
          ride.toLat,
          ride.toLng,
          ride.vehicleType
        );
        if (!cancelled && res.data.geometry) {
          const coordinates = res.data.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
          setRouteGeometries((current) =>
            current[ride.id] ? current : { ...current, [ride.id]: coordinates }
          );
        }
      } catch {
        if (!cancelled) {
          setRouteGeometries((current) =>
            current[ride.id]
              ? current
              : {
                  ...current,
                  [ride.id]: [
                    [ride.fromLat, ride.fromLng],
                    [ride.toLat, ride.toLng],
                  ],
                }
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rides]);

  const handleBook = async (ride) => {
    if (bookingId) return;
    if (!user) {
      addToast("Please login to book a seat", "error");
      return;
    }

    if (ride.user?.id === user.id) {
      addToast("This is your trip", "warning");
      return;
    }

    if (ride.seatsAvailable <= 0) {
      addToast("This trip is full", "warning");
      return;
    }

    if (requestedTripIds.has(ride.id)) {
      addToast("You have already requested this ride", "warning");
      return;
    }

    try {
      setBookingId(ride.id);
      await requestRide(ride.id);
      addToast("Ride requested. Waiting for driver confirmation.", "success");
      onRideBooked?.(ride.id);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not request ride", "error");
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-md"
      style={{ height: "min(300px, 50vw)", minHeight: 180 }}
    >
      <MapContainer center={center} zoom={userLocation ? 11 : 5} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]} icon={youIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={10000}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#93c5fd",
                fillOpacity: 0.12,
                dashArray: "8 8",
              }}
            />
          </>
        )}

        {rides.map((ride) => {
          const routeCoords = routeGeometries[ride.id];
          if (!routeCoords) return null;
          return (
            <Polyline
              key={`route-${ride.id}`}
              positions={routeCoords}
              pathOptions={{ color: "#f97316", weight: 4, opacity: 0.7 }}
            />
          );
        })}

        {rides
          .filter((ride) => Number.isFinite(Number(ride.fromLat)) && Number.isFinite(Number(ride.fromLng)))
          .map((ride) => {
            const isFull = ride.seatsAvailable <= 0;
            const alreadyRequested = requestedTripIds.has(ride.id);
            const ownTrip = user?.id === ride.user?.id;
            const disabled = isFull || alreadyRequested || ownTrip || bookingId === ride.id;

            return (
              <Marker
                key={ride.id}
                position={[ride.fromLat, ride.fromLng]}
                icon={isFull ? fullIcon : availableIcon}
              >
                <Popup>
                  <div className="min-w-45 max-w-[calc(100vw-64px)]">
                    <h3 className="text-base font-extrabold text-gray-950">
                      {ride.user?.name || "Driver"}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Rating: {ride.user?.rating ? Number(ride.user.rating).toFixed(1) : "New"}
                    </p>
                    <p className="mt-2 font-bold text-gray-900">
                      {ride.from} to {ride.to}
                    </p>
                    <p className="text-sm text-gray-600">{formatShortDateTime(ride.time)}</p>
                    <p className="mt-1 text-sm text-gray-600">Seats: {ride.seatsAvailable}</p>
                    {(ride.distanceKm || ride.estimatedFare) && (
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        <p className="text-xs text-gray-500">
                          {ride.distanceKm ? `${ride.distanceKm}km from you` : "Fare estimate"}
                          {ride.estimatedFare ? ` · ~Rs ${ride.estimatedFare}` : ""}
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleBook(ride)}
                        className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
                      >
                        {bookingId === ride.id
                          ? "Requesting..."
                          : isFull
                            ? "Full"
                            : alreadyRequested
                              ? "Pending"
                              : ownTrip
                                ? "Your trip"
                                : "Book Seat"}
                      </button>
                      <Link
                        to={`/chat/${ride.user?.id}`}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
