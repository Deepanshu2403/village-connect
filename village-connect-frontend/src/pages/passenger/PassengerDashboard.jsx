import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getPassengerDashboard } from "../../api/dashboardApi";
import { deletePassengerRequest } from "../../api/rideApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function PassengerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [dashData, setDashData] = useState({
    activeRide: null,
    confirmedRides: [],
    pendingRides: [],
    goodsRequests: [],
    recentlyCompleted: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setError("");
    try {
      const res = await getPassengerDashboard();
      setDashData({
        activeRide: res.data.activeRide || null,
        confirmedRides: res.data.confirmedRides || [],
        pendingRides: res.data.pendingRides || [],
        goodsRequests: res.data.goodsRequests || [],
        recentlyCompleted: res.data.recentlyCompleted || null,
      });
    } catch {
      if (!silent) setError("Failed to load passenger dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = window.setInterval(() => fetchDashboard(true), 20000);
    return () => window.clearInterval(interval);
  }, []);

  const handleDeleteRequest = async (requestId) => {
    if (deletingId) return;
    setDeletingId(requestId);
    try {
      await deletePassengerRequest(requestId);
      addToast("Request removed", "info");
      setDashData((prev) => ({
        ...prev,
        pendingRides: prev.pendingRides.filter((ride) => ride.id !== requestId),
      }));
    } catch (err) {
      addToast(err.response?.data?.error || "Could not remove request", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const activeRide = dashData.activeRide || null;
  const confirmedRide = dashData.confirmedRides?.[0] || null;
  const pendingRides = dashData.pendingRides || [];
  const completedRide = dashData.recentlyCompleted || null;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-extrabold text-gray-900">{error}</h1>
          <button
            type="button"
            onClick={() => fetchDashboard()}
            className="mt-5 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-orange-600">Passenger dashboard</p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
            Hello, {user?.name}
          </h1>
        </section>

        {activeRide && <ActiveRideCard ride={activeRide} />}
        {!activeRide && confirmedRide && <ConfirmedRideCard ride={confirmedRide} />}
        {completedRide && <CompletedRideCard ride={completedRide} />}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pending Requests</h2>
              <p className="text-sm text-gray-500">
                Waiting for driver response.
              </p>
            </div>
            <Link
              to="/home"
              className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
            >
              Find Rides
            </Link>
          </div>

          {pendingRides.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              No pending requests.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRides.map((ride) => (
                <PendingRideCard
                  key={ride.id}
                  ride={ride}
                  deletingId={deletingId}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          )}
        </section>

        {!activeRide && !confirmedRide && pendingRides.length === 0 && !completedRide && (
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-10 text-center">
            <div className="text-5xl mb-4">Bus</div>
            <h3 className="text-base font-bold text-gray-800">No active rides</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Find available rides near you and book a seat
            </p>
            <Link
              to="/home"
              className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Find Rides
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function ActiveRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-sm font-extrabold text-blue-800 uppercase tracking-wide">
          Ride In Progress
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="w-0.5 h-8 bg-gray-300" />
          <div className="w-3 h-3 rounded-full bg-red-500" />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-sm font-bold text-gray-900">{ride.travelPost?.from}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Destination</p>
            <p className="text-sm font-bold text-gray-900">{ride.travelPost?.to}</p>
          </div>
        </div>
      </div>

      <DriverContactCard driver={driver} vehicleType={ride.travelPost?.vehicleType} tone="blue" />

      {ride.pickupConfirmed && (
        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-yellow-800">
            Picked up at{" "}
            {ride.pickedUpAt &&
              new Date(ride.pickedUpAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </p>
        </div>
      )}
    </div>
  );
}

function ConfirmedRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm font-bold text-green-800">Confirmed Ride</span>
      </div>

      <h3 className="text-base font-extrabold text-gray-900 mb-1">
        {ride.travelPost?.from} to {ride.travelPost?.to}
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        Departing{" "}
        {new Date(ride.travelPost?.time).toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="bg-white rounded-xl border border-green-100 p-4 mb-3">
        <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
          Your Driver
        </p>
        <div className="flex items-center justify-between gap-3">
          <DriverIdentity driver={driver} vehicleType={ride.travelPost?.vehicleType} />
          <div className="flex flex-col gap-2">
            <a
              href={`tel:${driver?.phone}`}
              className="bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
            >
              Call
            </a>
            <Link
              to={`/chat/${driver?.id}`}
              className="bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold px-3 py-2 rounded-xl text-center"
            >
              Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletedRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-green-500 text-lg">Done</span>
        <h3 className="text-base font-bold text-gray-900">Trip Completed!</h3>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4">
        <p className="text-sm font-bold text-gray-900 mb-2">
          {ride.travelPost?.from} to {ride.travelPost?.to}
        </p>
        {ride.pickedUpAt && (
          <p className="text-xs text-gray-500">
            Picked up: {new Date(ride.pickedUpAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {ride.droppedAt && (
          <p className="text-xs text-gray-500 mt-0.5">
            Dropped: {new Date(ride.droppedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {ride.durationMinutes && (
          <p className="text-xs text-gray-500 mt-0.5">Duration: {ride.durationMinutes} minutes</p>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
        <DriverAvatar name={driver?.name} />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{driver?.name}</p>
          <p className="text-xs text-gray-500">{ride.travelPost?.vehicleType}</p>
          {driver?.rating > 0 && (
            <p className="text-xs text-yellow-600">
              Current rating: {Number(driver.rating).toFixed(1)}
            </p>
          )}
        </div>
      </div>

      {!ride.hasRated ? (
        <Link
          to={`/rate/${driver?.id}/${ride.travelPost?.id}`}
          className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          Rate Your Experience
        </Link>
      ) : (
        <div className="text-center py-3 bg-green-50 rounded-xl border border-green-100">
          <p className="text-sm font-semibold text-green-700">You rated this trip</p>
        </div>
      )}

      <Link
        to="/history"
        className="block text-center text-sm text-gray-500 hover:text-orange-500 mt-3 transition-colors"
      >
        View trip history
      </Link>
    </div>
  );
}

function PendingRideCard({ ride, deletingId, onDelete }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-gray-900">
          {ride.travelPost?.from} to {ride.travelPost?.to}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Driver: {ride.travelPost?.user?.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(ride.travelPost?.time).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <ExpiryCountdown expiresAt={ride.expiresAt} />
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold text-center">
          Pending
        </span>
        <button
          type="button"
          onClick={() => onDelete(ride.id)}
          disabled={deletingId === ride.id}
          className="text-xs bg-red-50 hover:bg-red-500 hover:text-white text-red-500 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-1 justify-center"
        >
          {deletingId === ride.id ? (
            <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : "Remove"}
        </button>
        <Link
          to={`/chat/${ride.travelPost?.user?.id}`}
          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg transition-colors text-center font-medium"
        >
          Chat
        </Link>
      </div>
    </div>
  );
}

function ExpiryCountdown({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsUrgent(false);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setIsUrgent(diff < 3 * 60 * 1000);
      setTimeLeft(hours > 0 ? `Expires in ${hours}h ${minutes}m` : `Expires in ${minutes}m`);
    };
    update();
    const interval = window.setInterval(update, 60000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return (
    <p className={`text-xs mt-1 font-medium ${isUrgent ? "text-red-500" : "text-gray-400"}`}>
      {isUrgent && "Soon: "}{timeLeft}
    </p>
  );
}

function DriverContactCard({ driver, vehicleType }) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-4 flex items-center justify-between gap-3">
      <DriverIdentity driver={driver} vehicleType={vehicleType} />
      <a
        href={`tel:${driver?.phone}`}
        className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors"
      >
        Call
      </a>
    </div>
  );
}

function DriverIdentity({ driver, vehicleType }) {
  return (
    <div className="flex items-center gap-3">
      <DriverAvatar name={driver?.name} />
      <div>
        <p className="text-sm font-bold text-gray-900">{driver?.name}</p>
        <p className="text-xs text-gray-500">{vehicleType}</p>
        {driver?.rating > 0 && (
          <p className="text-xs text-yellow-600">
            {Number(driver.rating).toFixed(1)}
            {driver?.totalRatings ? ` (${driver.totalRatings} ratings)` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function DriverAvatar({ name }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {name?.charAt(0)?.toUpperCase() || "D"}
    </div>
  );
}
