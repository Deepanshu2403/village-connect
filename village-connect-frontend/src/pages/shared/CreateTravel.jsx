import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { createTravel } from "../../api/travelApi";
import { getDriverDashboard } from "../../api/dashboardApi";
import { calculateRoute } from "../../api/locationApi";
import BackButton from "../../components/common/BackButton";
import LocationSearch from "../../components/location/LocationSearch";
import { useToast } from "../../context/ToastContext";

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const VEHICLE_TYPES = [
  { value: "Bike", label: "Bike", seats: 1 },
  { value: "Scooty", label: "Scooty", seats: 1 },
  { value: "Auto Rickshaw", label: "Auto Rickshaw", seats: 3 },
  { value: "Car", label: "Car", seats: 4 },
  { value: "Jeep", label: "Jeep", seats: 6 },
  { value: "Van", label: "Van", seats: 8 },
  { value: "Pickup Vehicle", label: "Pickup Vehicle", seats: 2 },
  { value: "Tractor Trolley", label: "Tractor Trolley", seats: 10 },
  { value: "Shared Bike", label: "Shared Bike", seats: 1 },
];

const initialForm = {
  time: "",
  seatsAvailable: 4,
  vehicleType: "Car",
  canCarryGoods: false,
  capacityKg: 0,
};

export default function CreateTravel() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fromLocation, setFromLocation] = useState({ name: "", lat: null, lng: null });
  const [toLocation, setToLocation] = useState({ name: "", lat: null, lng: null });
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingActiveTrip, setCheckingActiveTrip] = useState(true);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [error, setError] = useState("");

  const fromPosition = useMemo(
    () =>
      Number.isFinite(Number(fromLocation.lat)) && Number.isFinite(Number(fromLocation.lng))
        ? { lat: Number(fromLocation.lat), lng: Number(fromLocation.lng) }
        : INDIA_CENTER,
    [fromLocation.lat, fromLocation.lng]
  );

  const toPosition = useMemo(
    () =>
      Number.isFinite(Number(toLocation.lat)) && Number.isFinite(Number(toLocation.lng))
        ? { lat: Number(toLocation.lat), lng: Number(toLocation.lng) }
        : INDIA_CENTER,
    [toLocation.lat, toLocation.lng]
  );

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    let mounted = true;
    getDriverDashboard()
      .then((res) => {
        if (!mounted) return;
        const active = (res.data.posts || []).some((post) =>
          ["scheduled", "active", "pickup_done"].includes(post.status)
        );
        setHasActiveTrip(active);
      })
      .catch(() => addToast("Could not check active trips", "error"))
      .finally(() => {
        if (mounted) setCheckingActiveTrip(false);
      });
    return () => {
      mounted = false;
    };
  }, [addToast]);

  useEffect(() => {
    if (
      fromLocation.lat &&
      fromLocation.lng &&
      toLocation.lat &&
      toLocation.lng
    ) {
      calculateRoute(
        fromLocation.lat,
        fromLocation.lng,
        toLocation.lat,
        toLocation.lng,
        form.vehicleType
      )
        .then((res) => setRouteInfo(res.data))
        .catch(() => setRouteInfo(null));
      return;
    }
    setRouteInfo(null);
  }, [fromLocation, toLocation, form.vehicleType]);

  const handleVehicleChange = (vehicleType) => {
    const selected = VEHICLE_TYPES.find((item) => item.value === vehicleType);
    setForm((current) => ({
      ...current,
      vehicleType,
      seatsAvailable: selected?.seats || current.seatsAvailable,
    }));
  };

  const setLocationFromMap = (type, lat, lng) => {
    if (type === "from") {
      setFromLocation((current) => ({ ...current, lat, lng }));
    } else {
      setToLocation((current) => ({ ...current, lat, lng }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!fromLocation.name.trim() || !toLocation.name.trim() || !form.time || !form.vehicleType) {
      setError("From, to, date/time, and vehicle type are required.");
      return;
    }
    if (Number(form.seatsAvailable) < 1) {
      setError("At least one seat must be available.");
      return;
    }
    if (form.canCarryGoods && Number(form.capacityKg) < 1) {
      setError("Enter goods capacity in kg.");
      return;
    }

    setLoading(true);
    try {
      await createTravel({
        from: fromLocation.name,
        to: toLocation.name,
        time: form.time,
        vehicleType: form.vehicleType,
        seatsAvailable: Number(form.seatsAvailable),
        canCarryGoods: form.canCarryGoods,
        capacityKg: form.canCarryGoods ? Number(form.capacityKg) : 0,
        fromLat: fromLocation.lat,
        fromLng: fromLocation.lng,
        toLat: toLocation.lat,
        toLng: toLocation.lng,
      });
      addToast("Travel route posted successfully", "success");
      navigate("/driver");
    } catch (err) {
      const message = err.response?.data?.error || "Could not create travel post.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-3 pb-6 pt-20 md:px-6 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="pb-4 pt-2">
          <BackButton label="Back to Dashboard" to="/driver" />
        </div>
        <div className="mb-4 md:mb-6">
          <p className="text-sm font-semibold text-orange-600">Driver tools</p>
          <h1 className="mt-1 text-lg font-extrabold text-gray-950 md:text-xl">
            Post a travel route
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add route details and place markers for pickup and dropoff.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-white p-3 shadow-md md:p-5" noValidate>
          {checkingActiveTrip ? (
            <div className="rounded-2xl bg-white p-4 text-center text-sm font-semibold text-gray-600 md:p-5">
              Checking your active trips...
            </div>
          ) : hasActiveTrip ? (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-center md:p-5">
              <h3 className="text-base font-bold text-gray-900">You have an active trip</h3>
              <p className="mt-2 text-sm text-gray-500">
                Complete or cancel your current trip before posting a new one.
              </p>
              <button
                type="button"
                onClick={() => navigate("/driver")}
                className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600 md:p-4">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <LocationSearch
                  label="From"
                  placeholder="e.g. Sector 12, Bathinda"
                  value={fromLocation}
                  onChange={setFromLocation}
                  onCoordinatesChange={(coords) =>
                    setFromLocation((current) => ({ ...current, ...coords }))
                  }
                />
                <LocationSearch
                  label="To"
                  placeholder="e.g. Bus Stand, Patiala"
                  value={toLocation}
                  onChange={setToLocation}
                  onCoordinatesChange={(coords) =>
                    setToLocation((current) => ({ ...current, ...coords }))
                  }
                  showCurrentLocation={false}
                />
                <Field label="Date and time">
                  <input
                    type="datetime-local"
                    value={form.time}
                    onChange={(event) => update("time", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Vehicle type">
                  <select
                    value={form.vehicleType}
                    onChange={(event) => handleVehicleChange(event.target.value)}
                    className={inputClass}
                  >
                    {VEHICLE_TYPES.map((vehicle) => (
                      <option key={vehicle.value} value={vehicle.value}>
                        {vehicle.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Seats available">
                  <input
                    type="number"
                    min="1"
                    value={form.seatsAvailable}
                    onChange={(event) => update("seatsAvailable", event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 md:px-4">
                  <span>
                    <span className="block text-sm font-bold text-gray-800">Can carry goods</span>
                    <span className="text-sm text-gray-500">Allow parcel requests on this trip</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.canCarryGoods}
                    onChange={(event) => update("canCarryGoods", event.target.checked)}
                    className="h-5 w-5 accent-orange-500"
                  />
                </label>
                {form.canCarryGoods && (
                  <Field label="Goods capacity (kg)">
                    <input
                      type="number"
                      min="1"
                      value={form.capacityKg}
                      onChange={(event) => update("capacityKg", event.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>

              {routeInfo && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-semibold text-gray-800">
                      {routeInfo.distanceKm} km
                    </span>
                    <span className="text-sm text-gray-600">
                      ~{routeInfo.durationMin} min
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      Rs {routeInfo.estimatedFare} estimated fare
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <LocationPicker
                  title="Pickup location"
                  position={fromPosition}
                  onChange={(lat, lng) => setLocationFromMap("from", lat, lng)}
                />
                <LocationPicker
                  title="Dropoff location"
                  position={toPosition}
                  onChange={(lat, lng) => setLocationFromMap("to", lat, lng)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loading ? "Posting route..." : "Post Travel"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}

const LocationPicker = ({ title, position, onChange }) => (
  <div>
    <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
      <h2 className="text-sm font-bold text-gray-700">{title}</h2>
      <p className="text-xs font-semibold text-gray-500">
        {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
      </p>
    </div>
    <div className="h-[280px] overflow-hidden rounded-2xl border border-gray-200 md:h-[400px]">
      <MapContainer
        key={`${title}-${position.lat}-${position.lng}`}
        center={[position.lat, position.lng]}
        zoom={position.lat === INDIA_CENTER.lat && position.lng === INDIA_CENTER.lng ? 5 : 12}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onChange={onChange} />
        <Marker
          position={[position.lat, position.lng]}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target;
              const next = marker.getLatLng();
              onChange(next.lat, next.lng);
            },
          }}
        />
      </MapContainer>
    </div>
    <p className="mt-2 text-xs text-gray-500">Click on the map or drag the marker.</p>
  </div>
);

const MapClickHandler = ({ onChange }) => {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-gray-700">{label}</span>
    {children}
  </label>
);
