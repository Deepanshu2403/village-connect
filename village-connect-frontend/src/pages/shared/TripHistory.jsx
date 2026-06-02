import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import API from "../../api/client";

export default function TripHistory() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchHistory = async () => {
    try {
      const endpoint = user?.role === "driver" ? "/driver/history" : "/passenger/history";
      const res = await API.get(endpoint);
      if (user?.role === "driver") {
        setHistory(res.data.trips || []);
      } else {
        setHistory(res.data.rides || []);
      }
    } catch {
      addToast("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.role]);

  const filtered =
    filter === "all" ? history : history.filter((item) => item.status === filter);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="page-root min-h-screen bg-gray-50 pt-16">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="pb-4 pt-2">
          <BackButton label="Back" />
        </div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Trip History</h1>
            <p className="text-sm text-gray-500 mt-0.5">{history.length} total trips</p>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-5 w-fit gap-1">
          {["all", "completed", "cancelled"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                filter === item
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
            <div className="text-4xl mb-3">List</div>
            <p className="text-base font-semibold text-gray-700">No trips yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Your completed trips will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {user?.role === "driver"
              ? filtered.map((trip) => <DriverTripCard key={trip.id} trip={trip} />)
              : filtered.map((ride) => <PassengerRideCard key={ride.id} ride={ride} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DriverTripCard({ trip }) {
  const pickupTime = trip.pickedUpAt
    ? new Date(trip.pickedUpAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const dropTime = trip.droppedAt
    ? new Date(trip.droppedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-base font-extrabold text-gray-900">
            {trip.from} to {trip.to}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(trip.time).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusPill status={trip.status} />
      </div>

      {(pickupTime || dropTime || trip.durationMinutes) && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-4 flex-wrap">
          {pickupTime && (
            <div className="text-center">
              <p className="text-xs text-gray-400">Picked up</p>
              <p className="text-sm font-bold text-gray-800">{pickupTime}</p>
            </div>
          )}
          {pickupTime && dropTime && (
            <div className="flex-1 flex items-center justify-center">
              <div className="h-0.5 bg-orange-300 flex-1 max-w-[60px]" />
              {trip.durationMinutes && (
                <span className="text-xs text-orange-500 font-bold mx-2">
                  {trip.durationMinutes}m
                </span>
              )}
              <div className="h-0.5 bg-orange-300 flex-1 max-w-[60px]" />
            </div>
          )}
          {dropTime && (
            <div className="text-center">
              <p className="text-xs text-gray-400">Dropped</p>
              <p className="text-sm font-bold text-gray-800">{dropTime}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{trip.completedPassengers} passengers</span>
        <span>{trip.vehicleType}</span>
        {trip.canCarryGoods && <span>Goods</span>}
      </div>
    </div>
  );
}

function PassengerRideCard({ ride }) {
  const driver = ride.travelPost?.user;
  const post = ride.travelPost;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-base font-extrabold text-gray-900">
            {post?.from} to {post?.to}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(post?.time).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusPill status={ride.status} />
      </div>

      {ride.durationMinutes && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-4">
          {ride.pickedUpAt && (
            <div>
              <p className="text-xs text-gray-400">Picked up</p>
              <p className="text-sm font-bold text-gray-800">
                {new Date(ride.pickedUpAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
          <span className="text-xs text-orange-500 font-bold mx-auto">
            {ride.durationMinutes} min
          </span>
          {ride.droppedAt && (
            <div>
              <p className="text-xs text-gray-400">Dropped</p>
              <p className="text-sm font-bold text-gray-800">
                {new Date(ride.droppedAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {driver && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {driver.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{driver.name}</p>
            <p className="text-xs text-gray-400">{post?.vehicleType}</p>
          </div>
          {driver.rating > 0 && (
            <span className="ml-auto text-xs text-yellow-600 font-semibold">
              {Number(driver.rating).toFixed(1)}
            </span>
          )}
        </div>
      )}

      {ride.status === "completed" && !ride.hasRated && (
        <Link
          to={`/rate/${driver?.id}/${post?.id}`}
          className="block text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
        >
          Rate This Trip
        </Link>
      )}

      {ride.status === "completed" && ride.hasRated && (
        <div className="text-center py-2 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs font-semibold text-green-700">Rated</p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const colors =
    status === "completed"
      ? "bg-green-100 text-green-700"
      : status === "cancelled"
        ? "bg-red-100 text-red-600"
        : status === "rejected"
          ? "bg-gray-100 text-gray-500"
          : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${colors}`}>
      {status}
    </span>
  );
}
