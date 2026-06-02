import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { getPassengerDashboard } from "../../api/dashboardApi";
import { cancelItemRequest } from "../../api/itemApi";
import { deletePassengerRequest } from "../../api/rideApi";
import ActiveGoodsCard from "../../components/passenger/ActiveGoodsCard";
import LocationDisplay from "../../components/location/LocationDisplay";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { formatQuantity } from "../../utils/formatQuantity";

export default function PassengerDashboard() {
  const { user } = useAuth();
  const { on, off } = useSocket() || {};
  const { addToast } = useToast();
  const {
    location,
    locationName,
    loading: locationLoading,
    permissionDenied,
    refetch: refetchLocation,
  } = useCurrentLocation();
  const [dashData, setDashData] = useState({
    activeRide: null,
    confirmedRides: [],
    pendingRides: [],
    goodsRequests: [],
    activeGoodsMatches: [],
    itemRequests: [],
    recentlyCompleted: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [itemCancelDialog, setItemCancelDialog] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setError("");
    try {
      const res = await getPassengerDashboard();
      setDashData({
        activeRide: res.data.activeRide || null,
        confirmedRides: res.data.confirmedRides || [],
        pendingRides: res.data.pendingRides || [],
        goodsRequests: res.data.goodsRequests || [],
        activeGoodsMatches: res.data.activeGoodsMatches || [],
        itemRequests: res.data.itemRequests || [],
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

  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "prompt") setShowLocationPrompt(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!on || !off) return undefined;

    const handleRideAccepted = (eventData) => {
      addToast(`Your ride to ${eventData.post?.to || "your destination"} was accepted`, "success");
      fetchDashboard(true);
    };
    const handleRideRejected = (eventData) => {
      addToast(`Your ride request for ${eventData.from} to ${eventData.to} was not accepted`, "info");
      fetchDashboard(true);
    };
    const handleRideStarted = () => {
      addToast("Your driver has started the trip", "success");
      fetchDashboard(true);
    };
    const handleRideCompleted = () => {
      addToast("Trip completed. Please rate your driver.", "success");
      fetchDashboard(true);
    };
    const handleRideUpdated = () => fetchDashboard(true);
    const handleDashboardRefresh = () => fetchDashboard(true);
    const handleItemAccepted = (eventData) => {
      addToast(`Your item "${eventData.itemName}" request was accepted`, "success");
      fetchDashboard(true);
    };
    const handleItemInTransit = () => {
      addToast("Your item is on the way", "success");
      fetchDashboard(true);
    };
    const handleItemDelivered = () => {
      addToast("Your item has been delivered", "success");
      fetchDashboard(true);
    };

    on("ride:accepted", handleRideAccepted);
    on("ride:rejected", handleRideRejected);
    on("ride:started", handleRideStarted);
    on("ride:completed", handleRideCompleted);
    on("ride:updated", handleRideUpdated);
    on("dashboard:refresh", handleDashboardRefresh);
    on("item:accepted", handleItemAccepted);
    on("item:in_transit", handleItemInTransit);
    on("item:delivered", handleItemDelivered);

    return () => {
      off("ride:accepted", handleRideAccepted);
      off("ride:rejected", handleRideRejected);
      off("ride:started", handleRideStarted);
      off("ride:completed", handleRideCompleted);
      off("ride:updated", handleRideUpdated);
      off("dashboard:refresh", handleDashboardRefresh);
      off("item:accepted", handleItemAccepted);
      off("item:in_transit", handleItemInTransit);
      off("item:delivered", handleItemDelivered);
    };
  }, [addToast, off, on]);

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

  const handleCancelItem = async () => {
    if (!itemCancelDialog || cancellingItemId) return;
    const { id } = itemCancelDialog;
    setItemCancelDialog(null);
    setCancellingItemId(id);
    try {
      await cancelItemRequest(id);
      addToast("Item request removed", "info");
      setDashData((prev) => ({
        ...prev,
        itemRequests: prev.itemRequests.filter((request) => request.id !== id),
      }));
    } catch (err) {
      addToast(err.response?.data?.error || "Could not cancel request", "error");
    } finally {
      setCancellingItemId(null);
    }
  };

  const activeRide = dashData.activeRide || null;
  const confirmedRide = dashData.confirmedRides?.[0] || null;
  const pendingRides = dashData.pendingRides || [];
  const goodsRequests = dashData.goodsRequests || [];
  const activeGoodsMatches = dashData.activeGoodsMatches || [];
  const itemRequests = dashData.itemRequests || [];
  const activeItemRequests = itemRequests.filter(
    (request) => !["delivered", "cancelled"].includes(request.status)
  );
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
      <main className="page-root min-h-screen bg-gray-50 px-4 pb-10 pt-24">
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
    <main className="page-root min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            Passenger dashboard
          </p>
          <div className="mt-1 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Hello, {user?.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {pendingRides.length} pending rides, {goodsRequests.length} goods requests
              </p>
            </div>
            <StatusBadge tone="orange">
              <Star className="h-3 w-3" />
              {user?.rating ? Number(user.rating).toFixed(1) : "New"}
            </StatusBadge>
          </div>
        </section>

        {showLocationPrompt && !location && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <MapPin className="h-6 w-6 flex-shrink-0 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Enable location for better rides</p>
              <p className="mt-0.5 text-xs text-gray-500">
                We use your location to show nearby rides and help drivers find you.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    () => setShowLocationPrompt(false),
                    () => setShowLocationPrompt(false)
                  );
                }}
                className="mt-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
              >
                Allow Location Access
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationPrompt(false)}
              className="flex-shrink-0 text-lg leading-none text-gray-400 hover:text-gray-600"
            >
              x
            </button>
          </div>
        )}

        <div className="mb-4 flex items-start gap-3">
          <div className="flex-1">
            <LocationDisplay
              location={location}
              locationName={locationName}
              loading={locationLoading}
              permissionDenied={permissionDenied}
              onRequestPermission={refetchLocation}
            />
          </div>
        </div>

        <QuickActions />

        {activeRide && <ActiveRideCard ride={activeRide} />}
        {!activeRide && confirmedRide && <ConfirmedRideCard ride={confirmedRide} />}
        {completedRide && <CompletedRideCard ride={completedRide} />}

        {activeGoodsMatches.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-bold text-gray-700">Active Deliveries</h2>
            <div className="space-y-3">
              {activeGoodsMatches.map((match) => (
                <ActiveGoodsCard
                  key={match.id}
                  match={match}
                  onUpdate={() => fetchDashboard(true)}
                />
              ))}
            </div>
          </div>
        )}

        {activeItemRequests.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">My Item Requests</h2>
              <StatusBadge>{activeItemRequests.length}</StatusBadge>
            </div>
            <div className="space-y-3">
              {activeItemRequests.map((item) => (
                <ItemRequestCard
                  key={item.id}
                  item={item}
                  cancelling={cancellingItemId === item.id}
                  onRequestCancel={() =>
                    setItemCancelDialog({ id: item.id, itemName: item.itemName })
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pending Requests</h2>
              <p className="text-sm text-gray-500">Waiting for driver response.</p>
            </div>
            <Link
              to="/home"
              className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
            >
              Find Rides
            </Link>
          </div>

          {pendingRides.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No pending requests"
              text="Browse available trips and request a seat when you find a good match."
              action="Find Rides"
              to="/home"
            />
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

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Goods Requests</h2>
            <StatusBadge>{goodsRequests.length}</StatusBadge>
          </div>
          {goodsRequests.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="No goods requests"
              text="Create a delivery request and drivers travelling that route can help."
              action="Send Goods"
              to="/create-goods"
            />
          ) : (
            <div className="space-y-3">
              {goodsRequests.slice(0, 4).map((request) => (
                <GoodsRequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>
      </div>
      {itemCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-[380px] overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-lg">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <h3 className="text-base font-extrabold text-gray-900">Remove this request?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Your request for <strong>"{itemCancelDialog.itemName}"</strong> will be removed.
              No driver has accepted it yet.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setItemCancelDialog(null)}
                className="justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700"
              >
                Keep It
              </button>
              <button
                type="button"
                onClick={handleCancelItem}
                className="justify-center rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        to="/home"
        className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Search className="mb-3 h-8 w-8" />
        <h3 className="text-sm font-extrabold">Find a Ride</h3>
        <p className="mt-0.5 text-xs text-orange-100">Browse nearby trips</p>
      </Link>
      <Link
        to="/request-item"
        className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <ShoppingBag className="mb-3 h-8 w-8" />
        <h3 className="text-sm font-extrabold">Order from Town</h3>
        <p className="mt-0.5 text-xs text-purple-100">Ask a driver to bring items</p>
      </Link>
      <Link
        to="/create-goods"
        className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Package className="mb-3 h-8 w-8" />
        <h3 className="text-sm font-extrabold">Send Goods</h3>
        <p className="mt-0.5 text-xs text-blue-100">Request delivery</p>
      </Link>
    </div>
  );
}

function ActiveRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm font-extrabold uppercase tracking-wide text-blue-800">
          Ride In Progress
        </span>
      </div>

      <RouteBlock from={ride.travelPost?.from} to={ride.travelPost?.to} />
      <FareBadge fare={ride.travelPost?.estimatedFare} />
      <DriverContactCard driver={driver} vehicleType={ride.travelPost?.vehicleType} tone="blue" />

      {ride.pickupConfirmed && (
        <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
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
    </section>
  );
}

function ConfirmedRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusBadge tone="green">
          <CheckCircle className="h-3 w-3" />
          Confirmed
        </StatusBadge>
        <span className="text-xs font-medium text-gray-500">{ride.travelPost?.vehicleType}</span>
      </div>

      <RouteBlock from={ride.travelPost?.from} to={ride.travelPost?.to} />
      <FareBadge fare={ride.travelPost?.estimatedFare} />
      <p className="mb-3 mt-3 flex items-center gap-1 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        {new Date(ride.travelPost?.time).toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <DriverContactCard driver={driver} vehicleType={ride.travelPost?.vehicleType} tone="green" />
    </section>
  );
}

function CompletedRideCard({ ride }) {
  const driver = ride.travelPost?.user;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <h3 className="text-base font-bold text-gray-900">Trip Completed</h3>
      </div>

      <div className="mb-4 rounded-xl bg-gray-50 p-4">
        <p className="mb-2 text-sm font-bold text-gray-900">
          {ride.travelPost?.from} to {ride.travelPost?.to}
        </p>
        {ride.pickedUpAt && (
          <p className="text-xs text-gray-500">
            Picked up: {new Date(ride.pickedUpAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {ride.droppedAt && (
          <p className="mt-0.5 text-xs text-gray-500">
            Dropped: {new Date(ride.droppedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {ride.durationMinutes && (
          <p className="mt-0.5 text-xs text-gray-500">Duration: {ride.durationMinutes} minutes</p>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
        <DriverAvatar name={driver?.name} />
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">{driver?.name}</p>
          <p className="text-xs text-gray-500">{ride.travelPost?.vehicleType}</p>
          {driver?.rating > 0 && (
            <p className="text-xs text-yellow-600">Current rating: {Number(driver.rating).toFixed(1)}</p>
          )}
        </div>
      </div>

      {!ride.hasRated ? (
        <Link
          to={`/rate/${driver?.id}/${ride.travelPost?.id}`}
          className="block w-full rounded-xl bg-orange-500 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-orange-600"
        >
          Rate Your Experience
        </Link>
      ) : (
        <div className="rounded-xl border border-green-100 bg-green-50 py-3 text-center">
          <p className="text-sm font-semibold text-green-700">You rated this trip</p>
        </div>
      )}

      <Link
        to="/history"
        className="mt-3 block text-center text-sm text-gray-500 transition-colors hover:text-orange-500"
      >
        View trip history
      </Link>
    </section>
  );
}

function PendingRideCard({ ride, deletingId, onDelete }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <RouteBlock from={ride.travelPost?.from} to={ride.travelPost?.to} compact />
        <FareBadge fare={ride.travelPost?.estimatedFare} />
        <p className="mt-2 text-xs text-gray-500">Driver: {ride.travelPost?.user?.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {new Date(ride.travelPost?.time).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <ExpiryCountdown expiresAt={ride.expiresAt} />
      </div>
      <div className="flex flex-shrink-0 flex-wrap gap-2 sm:flex-col">
        <StatusBadge tone="amber">Pending</StatusBadge>
        <button
          type="button"
          onClick={() => onDelete(ride.id)}
          disabled={deletingId === ride.id}
          className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
        >
          {deletingId === ride.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </>
          )}
        </button>
        <Link
          to={`/chat/${ride.travelPost?.user?.id}`}
          className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-center text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </Link>
      </div>
    </article>
  );
}

function GoodsRequestCard({ request }) {
  const activeMatch = request.matches?.[0];

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{request.item}</p>
          <p className="mt-1 text-xs text-gray-500">
            {request.from} to {request.to}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{request.weightKg} kg</p>
          {activeMatch?.driver && (
            <p className="mt-2 text-xs font-medium text-blue-600">Driver: {activeMatch.driver.name}</p>
          )}
        </div>
        <StatusBadge tone={request.status === "pending" ? "amber" : "green"}>{request.status}</StatusBadge>
      </div>
    </article>
  );
}

function ItemRequestCard({ item, cancelling, onRequestCancel }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {item.itemName}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gray-500">
            {formatQuantity(item.quantity, item.quantityUnit)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {item.from} to {item.to}
          </p>
          {item.budget && (
            <p className="mt-0.5 text-xs text-gray-500">Budget: Rs {item.budget}</p>
          )}
        </div>
        <StatusBadge tone={item.status === "pending" ? "amber" : item.status === "in_transit" ? "blue" : "green"}>
          {item.status === "pending"
            ? "Waiting"
            : item.status === "accepted"
              ? "Accepted"
              : item.status === "in_transit"
                ? "On the way"
                : item.status}
        </StatusBadge>
      </div>
      {item.status === "pending" && (
        <button
          type="button"
          onClick={onRequestCancel}
          disabled={cancelling}
          className="mt-3 inline-flex min-h-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
        >
          {cancelling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {cancelling ? "Removing..." : "Remove"}
        </button>
      )}
      {item.acceptedBy && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs text-gray-500">
              Driver: <strong>{item.acceptedBy.name}</strong>
            </p>
            <p className="text-xs text-gray-400">{item.acceptedBy.phone}</p>
          </div>
          <a
            href={`tel:${item.acceptedBy.phone}`}
            className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        </div>
      )}
    </article>
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
    <p className={`mt-1 text-xs font-medium ${isUrgent ? "text-red-500" : "text-gray-400"}`}>
      {isUrgent && "Soon: "}
      {timeLeft}
    </p>
  );
}

function DriverContactCard({ driver, vehicleType, tone = "blue" }) {
  const toneClasses =
    tone === "green" ? "border-green-100 bg-white" : "border-blue-100 bg-white";

  return (
    <div className={`mt-4 flex items-center justify-between gap-3 rounded-xl border p-4 ${toneClasses}`}>
      <DriverIdentity driver={driver} vehicleType={vehicleType} />
      <div className="flex flex-col gap-2">
        <a
          href={`tel:${driver?.phone}`}
          className="flex items-center justify-center gap-1 rounded-xl bg-green-500 px-3 py-2 text-xs font-bold text-white hover:bg-green-600"
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
        <Link
          to={`/chat/${driver?.id}`}
          className="flex items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-600"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </Link>
      </div>
    </div>
  );
}

function DriverIdentity({ driver, vehicleType }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <DriverAvatar name={driver?.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-gray-900">{driver?.name}</p>
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
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white">
      {name?.charAt(0)?.toUpperCase() || "D"}
    </div>
  );
}

function RouteBlock({ from, to, compact = false }) {
  return (
    <div className={`flex items-start gap-2 ${compact ? "" : "mb-1"}`}>
      <div className="mt-1 flex flex-col items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-green-500" />
        <div className="h-3 w-px bg-gray-300" />
        <MapPin className="h-3.5 w-3.5 text-red-500" />
      </div>
      <div className="min-w-0 space-y-2">
        <p className="truncate text-sm font-bold text-gray-900">{from}</p>
        <p className="truncate text-sm font-bold text-gray-900">{to}</p>
      </div>
    </div>
  );
}

function StatusBadge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function FareBadge({ fare }) {
  if (!fare) return null;
  return (
    <span className="mt-2 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-sm font-bold text-green-700">
      ~Rs {fare}
    </span>
  );
}

function EmptyState({ icon, title, text, action, to }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-orange-500">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{text}</p>
      <Link
        to={to}
        className="mt-4 inline-flex rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
      >
        {action}
      </Link>
    </div>
  );
}
