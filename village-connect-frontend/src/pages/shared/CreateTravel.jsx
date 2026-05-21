import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { createTravel } from "../../api/travelApi";
import { getDriverDashboard } from "../../api/dashboardApi";
import { useToast } from "../../context/ToastContext";

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

const initialForm = {
  from: "",
  to: "",
  time: "",
  seatsAvailable: 1,
  vehicleType: "Car",
  canCarryGoods: false,
  capacityKg: 0,
  fromLat: "",
  fromLng: "",
  toLat: "",
  toLng: "",
};

export default function CreateTravel() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingActiveTrip, setCheckingActiveTrip] = useState(true);
  const [hasActiveTrip, setHasActiveTrip] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const fromPosition = useMemo(
    () =>
      form.fromLat && form.fromLng
        ? { lat: Number(form.fromLat), lng: Number(form.fromLng) }
        : INDIA_CENTER,
    [form.fromLat, form.fromLng]
  );

  const toPosition = useMemo(
    () =>
      form.toLat && form.toLng
        ? { lat: Number(form.toLat), lng: Number(form.toLng) }
        : INDIA_CENTER,
    [form.toLat, form.toLng]
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

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return (
        data.address?.village ||
        data.address?.town ||
        data.address?.city ||
        data.address?.county ||
        data.display_name ||
        ""
      );
    } catch {
      return "";
    }
  };

  const useCurrentLocationForFrom = () => {
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported in this browser", "error");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const placeName = await reverseGeocode(lat, lng);
        setForm((current) => ({
          ...current,
          from: placeName || current.from,
          fromLat: lat,
          fromLng: lng,
        }));
        addToast("Pickup location detected", "success");
        setLocating(false);
      },
      () => {
        addToast("Location access denied", "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const setLocation = (type, lat, lng) => {
    setForm((current) => ({
      ...current,
      [`${type}Lat`]: lat,
      [`${type}Lng`]: lng,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!form.from.trim() || !form.to.trim() || !form.time || !form.vehicleType) {
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
        ...form,
        seatsAvailable: Number(form.seatsAvailable),
        capacityKg: form.canCarryGoods ? Number(form.capacityKg) : 0,
        fromLat: form.fromLat === "" ? null : Number(form.fromLat),
        fromLng: form.fromLng === "" ? null : Number(form.fromLng),
        toLat: form.toLat === "" ? null : Number(form.toLat),
        toLng: form.toLng === "" ? null : Number(form.toLng),
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
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="font-semibold text-orange-600">Driver tools</p>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-950">Post a travel route</h1>
          <p className="mt-2 text-gray-500">
            Add route details and place draggable markers for pickup and dropoff.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl bg-white p-6 shadow-md" noValidate>
          {checkingActiveTrip ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-gray-600">
              Checking your active trips...
            </div>
          ) : hasActiveTrip ? (
            <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-6 text-center">
              <div className="text-4xl mb-3">!</div>
              <h3 className="text-base font-bold text-gray-900">You have an active trip</h3>
              <p className="text-sm text-gray-500 mt-2">
                Complete or cancel your current trip before posting a new one.
              </p>
              <button
                type="button"
                onClick={() => navigate("/driver")}
                className="mt-4 inline-flex bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <>
          {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="From">
              <div className="flex gap-2">
                <input
                  value={form.from}
                  onChange={(e) => update("from", e.target.value)}
                  className={inputClass}
                  placeholder="Starting village"
                />
                <button
                  type="button"
                  onClick={useCurrentLocationForFrom}
                  disabled={locating}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gray-200 hover:border-orange-400 disabled:opacity-60"
                  title="Use current location"
                >
                  <LocateFixed className="h-5 w-5 text-orange-600" />
                </button>
              </div>
            </Field>
            <Field label="To">
              <input value={form.to} onChange={(e) => update("to", e.target.value)} className={inputClass} placeholder="Destination" />
            </Field>
            <Field label="Date and time">
              <input type="datetime-local" value={form.time} onChange={(e) => update("time", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Vehicle type">
              <select value={form.vehicleType} onChange={(e) => update("vehicleType", e.target.value)} className={inputClass}>
                <option>Car</option>
                <option>Jeep</option>
                <option>Van</option>
                <option>Auto</option>
                <option>Bus</option>
                <option>Truck</option>
                <option>Tractor</option>
              </select>
            </Field>
            <Field label="Seats available">
              <input type="number" min="1" value={form.seatsAvailable} onChange={(e) => update("seatsAvailable", e.target.value)} className={inputClass} />
            </Field>
            <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span>
                <span className="block font-bold text-gray-800">Can carry goods</span>
                <span className="text-sm text-gray-500">Allow parcel requests on this trip</span>
              </span>
              <input
                type="checkbox"
                checked={form.canCarryGoods}
                onChange={(e) => update("canCarryGoods", e.target.checked)}
                className="h-5 w-5 accent-orange-500"
              />
            </label>
            {form.canCarryGoods && (
              <Field label="Goods capacity (kg)">
                <input type="number" min="1" value={form.capacityKg} onChange={(e) => update("capacityKg", e.target.value)} className={inputClass} />
              </Field>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <LocationPicker
              title="Pickup location"
              position={fromPosition}
              onChange={(lat, lng) => setLocation("from", lat, lng)}
            />
            <LocationPicker
              title="Dropoff location"
              position={toPosition}
              onChange={(lat, lng) => setLocation("to", lat, lng)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
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
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold text-gray-700">{title}</h2>
      <p className="text-xs font-semibold text-gray-500">
        {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
      </p>
    </div>
    <div className="h-80 overflow-hidden rounded-2xl border border-gray-200">
      <MapContainer
        key={`${position.lat}-${position.lng}`}
        center={[position.lat, position.lng]}
        zoom={position === INDIA_CENTER ? 5 : 12}
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

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-bold text-gray-700">{label}</span>
    {children}
  </label>
);
