import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { List, Map, MapPin, MessageCircle, Search, Star } from "lucide-react";
import { getPassengerDashboard } from "../../api/dashboardApi";
import { requestRide } from "../../api/rideApi";
import { getTravelPosts } from "../../api/travelApi";
import RideMap from "../../components/map/RideMap";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatShortDateTime, initials } from "../../utils/format";

export default function Home() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [trips, setTrips] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locationFilter, setLocationFilter] = useState(false);
  const [view, setView] = useState("list");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [requestingId, setRequestingId] = useState(null);

  const requestedTripIds = useMemo(
    () =>
      new Set(
        myRequests
          .filter((request) => ["pending", "requested", "accepted", "ongoing"].includes(request.status))
          .map((request) => request.travelPostId)
      ),
    [myRequests]
  );

  const buildParams = useCallback(
    (nextFilters = filters, useLocation = locationFilter, nextLocation = userLocation) => {
      const params = {};
      if (nextFilters.from.trim()) params.from = nextFilters.from.trim();
      if (nextFilters.to.trim()) params.to = nextFilters.to.trim();
      if (useLocation && nextLocation) {
        params.userLat = nextLocation.lat;
        params.userLng = nextLocation.lng;
        params.radiusKm = 10;
      }
      return params;
    },
    [filters, locationFilter, userLocation]
  );

  const fetchTrips = useCallback(
    async (params) => {
      setError("");
      setLoading(true);
      try {
        const [travelRes, dashboardRes] = await Promise.all([
          getTravelPosts(params),
          getPassengerDashboard(),
        ]);
        setTrips(travelRes.data.posts || []);
        setMyRequests(dashboardRes.data.rides || []);
      } catch {
        setError("Failed to load available rides.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchTrips({});
  }, [fetchTrips]);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchTrips(buildParams());
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported in this browser", "error");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(nextLocation);
        setLocationFilter(true);
        addToast("Location detected", "success");
        fetchTrips(buildParams(filters, true, nextLocation));
        setLocating(false);
      },
      () => {
        addToast("Location access denied. Showing all available rides.", "warning");
        setLocationFilter(false);
        setLocating(false);
        fetchTrips(buildParams(filters, false, null));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationToggle = (checked) => {
    setLocationFilter(checked);
    fetchTrips(buildParams(filters, checked, userLocation));
  };

  const handleBook = async (trip) => {
    if (requestingId) return;
    if (trip.user?.id === user?.id) {
      addToast("This is your trip", "warning");
      return;
    }

    if (trip.seatsAvailable <= 0) {
      addToast("This trip is full", "warning");
      return;
    }

    if (requestedTripIds.has(trip.id)) {
      addToast("You have already requested this ride", "warning");
      return;
    }

    setRequestingId(trip.id);
    try {
      await requestRide(trip.id);
      addToast("Ride requested. Waiting for driver confirmation.", "success");
      setMyRequests((current) => [
        ...current,
        {
          id: `local-${trip.id}`,
          travelPostId: trip.id,
          status: "pending",
          travelPost: trip,
        },
      ]);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not request ride", "error");
    } finally {
      setRequestingId(null);
    }
  };

  const markRideBooked = (tripId) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;
    setMyRequests((current) => [
      ...current,
      {
        id: `map-local-${tripId}`,
        travelPostId: tripId,
        status: "pending",
        travelPost: trip,
      },
    ]);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-gray-900 p-6 text-white shadow-md sm:p-8">
          <p className="font-semibold text-orange-300">Ride search</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">Find a route near you</h1>
          <p className="mt-3 max-w-2xl text-gray-300">
            Search by village or town, use your location to show pickup points within 10 km,
            and book an available seat.
          </p>
        </section>

        <form
          onSubmit={handleSearch}
          className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-md lg:grid-cols-[1fr_1fr_auto_auto]"
        >
          <input
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="From village or town"
          />
          <input
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="To village or town"
          />
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-800 transition hover:border-orange-400 disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {locating ? "Detecting..." : "Use My Location"}
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-gray-950">
              {userLocation ? "Location detected" : "Location not detected"}
            </p>
            <p className="text-sm text-gray-500">
              {userLocation
                ? "Filtering can show pickup points within 10 km of your current location."
                : "Use location to discover nearby pickup points."}
            </p>
          </div>
          <label className="flex items-center gap-3 font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={locationFilter}
              disabled={!userLocation}
              onChange={(event) => handleLocationToggle(event.target.checked)}
              className="h-5 w-5 accent-orange-500"
            />
            Filter by location (within 10km)
          </label>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-950">Results</h2>
            <p className="text-gray-500">{trips.length} ride{trips.length === 1 ? "" : "s"} found</p>
          </div>
          <div className="grid grid-cols-2 rounded-2xl bg-white p-1 shadow-md">
            <ViewButton active={view === "list"} onClick={() => setView("list")} icon={List}>
              List View
            </ViewButton>
            <ViewButton active={view === "map"} onClick={() => setView("map")} icon={Map}>
              Map View
            </ViewButton>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchTrips(buildParams())} />
          ) : trips.length === 0 ? (
            <EmptyState />
          ) : view === "map" ? (
            <RideMap
              rides={trips}
              userLocation={userLocation}
              requestedTripIds={requestedTripIds}
              onRideBooked={markRideBooked}
            />
          ) : (
            <div className="grid gap-4">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  userId={user?.id}
                  requested={requestedTripIds.has(trip.id)}
                  requesting={requestingId === trip.id}
                  onBook={() => handleBook(trip)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const ViewButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
      active ? "bg-orange-500 text-white" : "text-gray-600 hover:text-orange-600"
    }`}
  >
    <Icon className="h-4 w-4" />
    {children}
  </button>
);

const TripCard = ({ trip, userId, requested, requesting, onBook }) => {
  const full = trip.seatsAvailable <= 0;
  const ownTrip = trip.user?.id === userId;
  const disabled = full || requested || ownTrip || requesting;

  return (
    <article className="rounded-2xl bg-white p-6 shadow-md">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-orange-100 font-extrabold text-orange-700">
            {initials(trip.user?.name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-gray-950">
                {trip.from} to {trip.to}
              </h2>
              {full && <StatusBadge tone="gray">Full</StatusBadge>}
              {requested && <StatusBadge tone="yellow">Pending</StatusBadge>}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {trip.user?.name || "Driver"} • {formatShortDateTime(trip.time)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{trip.vehicleType}</Badge>
              <Badge>{trip.seatsAvailable} seats</Badge>
              {trip.canCarryGoods && <Badge>{trip.capacityKg} kg goods</Badge>}
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {trip.user?.rating ? Number(trip.user.rating).toFixed(1) : "New"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            title={ownTrip ? "This is your trip" : undefined}
            onClick={onBook}
            className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600"
          >
            {requesting ? "Requesting..." : full ? "Full" : requested ? "Pending" : ownTrip ? "Your trip" : "Book Seat"}
          </button>
          <Link
            to={`/chat/${trip.user?.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-semibold hover:border-orange-400"
          >
            <MessageCircle className="h-4 w-4" />
            Chat
          </Link>
        </div>
      </div>
    </article>
  );
};

const Badge = ({ children }) => (
  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
    {children}
  </span>
);

const StatusBadge = ({ tone, children }) => {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    yellow: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[tone]}`}>
      {children}
    </span>
  );
};

const EmptyState = () => (
  <div className="rounded-2xl bg-white p-8 text-center shadow-md">
    <p className="text-5xl">No rides</p>
    <h2 className="mt-4 text-xl font-extrabold text-gray-950">No rides found</h2>
    <p className="mt-2 text-gray-500">Try different villages or clear your filters.</p>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="rounded-2xl bg-white p-8 text-center shadow-md">
    <p className="text-5xl">Error</p>
    <h2 className="mt-4 text-xl font-extrabold text-gray-950">{message}</h2>
    <button
      type="button"
      onClick={onRetry}
      className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
    >
      Retry
    </button>
  </div>
);
