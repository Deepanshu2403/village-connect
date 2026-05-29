import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Check,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { getDriverDashboard } from "../../api/dashboardApi";
import { acceptGoodsDelivery, markGoodsDelivered, markGoodsPickup } from "../../api/goodsApi";
import {
  acceptRideRequest,
  deleteRideRequest,
  markDropDone,
  markPickupDone,
  rejectRideRequest,
  startTrip,
} from "../../api/rideApi";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useDriverLocationBroadcast } from "../../hooks/useDriverLocationBroadcast";
import { timeAgo } from "../../utils/timeAgo";

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { on, off } = useSocket() || {};
  const { addToast } = useToast();
  const [data, setData] = useState({
    activePost: null,
    scheduledPosts: [],
    todayCompleted: [],
    openGoodsRequests: [],
    activeGoodsMatches: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestActionId, setRequestActionId] = useState(null);
  const [tripActionLoading, setTripActionLoading] = useState(null);
  const [goodsActionLoading, setGoodsActionLoading] = useState(null);

  useDriverLocationBroadcast(data.activePost?.id);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setError("");
    try {
      const res = await getDriverDashboard();
      setData({
        activePost: res.data.activePost || null,
        scheduledPosts: res.data.scheduledPosts || [],
        todayCompleted: res.data.todayCompleted || [],
        openGoodsRequests: res.data.openGoodsRequests || [],
        activeGoodsMatches: res.data.activeGoodsMatches || [],
        stats: res.data.stats || {},
      });
    } catch {
      if (!silent) setError("Failed to load your driver dashboard.");
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
    if (!on || !off) return undefined;

    const handleNewRequest = (eventData) => {
      addToast(`New ride request from ${eventData.passengerName}`, "info");
      fetchDashboard(true);
    };
    const handleDashboardRefresh = () => fetchDashboard(true);

    on("ride:new_request", handleNewRequest);
    on("ride:updated", handleDashboardRefresh);
    on("dashboard:refresh", handleDashboardRefresh);
    return () => {
      off("ride:new_request", handleNewRequest);
      off("ride:updated", handleDashboardRefresh);
      off("dashboard:refresh", handleDashboardRefresh);
    };
  }, [addToast, off, on]);

  const handleRequestAction = async (requestId, action) => {
    if (requestActionId) return;
    setRequestActionId(`${action}-${requestId}`);
    try {
      if (action === "accept") {
        await acceptRideRequest(requestId);
        addToast("Ride request accepted", "success");
      }
      if (action === "reject") {
        await rejectRideRequest(requestId);
        addToast("Ride request rejected", "info");
      }
      if (action === "delete") {
        await deleteRideRequest(requestId);
        addToast("Ride request removed", "info");
      }
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not update request", "error");
    } finally {
      setRequestActionId(null);
    }
  };

  const handleStartTrip = async (postId) => {
    if (tripActionLoading) return;
    setTripActionLoading(`start-${postId}`);
    try {
      await startTrip(postId);
      addToast("Trip started", "success");
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not start trip", "error");
    } finally {
      setTripActionLoading(null);
    }
  };

  const handlePickupDone = async (postId) => {
    if (tripActionLoading) return;
    setTripActionLoading(`pickup-${postId}`);
    try {
      await markPickupDone(postId);
      addToast("Pickup confirmed", "success");
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not confirm pickup", "error");
    } finally {
      setTripActionLoading(null);
    }
  };

  const handleDropDone = async (postId) => {
    if (tripActionLoading) return;
    setTripActionLoading(`drop-${postId}`);
    try {
      await markDropDone(postId);
      addToast("Trip completed", "success");
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not complete trip", "error");
    } finally {
      setTripActionLoading(null);
    }
  };

  const handleAcceptGoods = async (goodsId) => {
    if (goodsActionLoading) return;
    setGoodsActionLoading(goodsId);
    try {
      const activeTripId = data?.scheduledPosts?.[0]?.id || data?.activePost?.id;
      if (!activeTripId) {
        addToast("You need an active or scheduled trip to accept goods delivery", "warning");
        return;
      }
      await acceptGoodsDelivery({ goodsRequestId: goodsId, travelPostId: activeTripId });
      addToast("Goods delivery accepted", "success");
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to accept goods", "error");
    } finally {
      setGoodsActionLoading(null);
    }
  };

  const handleGoodsStatus = async (matchId, action) => {
    if (goodsActionLoading) return;
    setGoodsActionLoading(`${action}-${matchId}`);
    try {
      if (action === "pickup") {
        await markGoodsPickup(matchId);
        addToast("Goods pickup marked", "success");
      } else {
        await markGoodsDelivered(matchId);
        addToast("Goods delivered", "success");
      }
      await fetchDashboard(true);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not update goods delivery", "error");
    } finally {
      setGoodsActionLoading(null);
    }
  };

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

  const {
    activePost,
    scheduledPosts = [],
    openGoodsRequests = [],
    activeGoodsMatches = [],
    stats = {},
  } = data || {};
  const todayCompleted = data?.todayCompleted || [];
  const pendingRequests = scheduledPosts.flatMap((post) =>
    (post.rideRequests || [])
      .filter((request) => ["pending", "requested"].includes(request.status))
      .map((request) => ({ ...request, travelPost: post }))
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-5 text-white">
          <div className="absolute inset-0 rounded-2xl bg-orange-500 opacity-5" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Good {getTimeOfDay()}
                </p>
                <h1 className="mt-0.5 text-xl font-extrabold">{user?.name}</h1>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-1.5">
                <p className="flex items-center gap-1 text-xs text-gray-300">
                  <Star className="h-3.5 w-3.5 fill-orange-300 text-orange-300" />
                  {user?.rating ? Number(user.rating).toFixed(1) : "New"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <StatTile label="Scheduled" value={stats.scheduledCount || 0} />
              <StatTile label="Pending" value={stats.pendingCount || 0} highlight />
              <StatTile label="Completed" value={stats.totalCompleted || 0} />
            </div>

            <Link
              to="/create-travel"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Post Travel
            </Link>
          </div>
        </section>

        {activePost && (
          <ActiveTripCard
            post={activePost}
            tripActionLoading={tripActionLoading}
            onPickupDone={handlePickupDone}
            onDropDone={handleDropDone}
          />
        )}

        {activeGoodsMatches.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Active Goods Deliveries</h2>
                <p className="text-xs text-gray-500">Update pickup and delivery status.</p>
              </div>
            </div>
            <div className="space-y-3">
              {activeGoodsMatches.map((match) => (
                <ActiveGoodsDeliveryCard
                  key={match.id}
                  match={match}
                  actionLoading={goodsActionLoading}
                  onStatus={handleGoodsStatus}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Pending Requests</h2>
            <StatusBadge tone="amber">{pendingRequests.length}</StatusBadge>
          </div>
          {pendingRequests.length === 0 ? (
            <EmptyState
              title="No pending requests"
              text="New ride requests will appear here as soon as passengers ask to join."
              action="Review trips"
              to="/driver"
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  actionLoading={requestActionId}
                  onAction={handleRequestAction}
                />
              ))}
            </div>
          )}
        </section>

        {openGoodsRequests.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Goods Delivery Requests</h2>
                <p className="text-xs text-gray-500">
                  {openGoodsRequests.length} delivery request{openGoodsRequests.length !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {openGoodsRequests.map((goods) => (
                <GoodsDeliveryRequestCard
                  key={goods.id}
                  goods={goods}
                  loading={goodsActionLoading === goods.id}
                  onAccept={() => handleAcceptGoods(goods.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Scheduled Trips</h2>
            <StatusBadge>{scheduledPosts.length}</StatusBadge>
          </div>
          {scheduledPosts.length === 0 ? (
            <EmptyState
              title="No future trips"
              text="Post a travel plan so nearby passengers can request seats."
              action="Post Travel"
              to="/create-travel"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {scheduledPosts.map((post) => (
                <ScheduledTripCard
                  key={post.id}
                  post={post}
                  tripActionLoading={tripActionLoading}
                  onStartTrip={handleStartTrip}
                  onOpen={() => navigate(`/travel/${post.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {todayCompleted.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Completed Today</h2>
              <Link to="/history" className="text-sm font-semibold text-orange-500 hover:text-orange-600">
                View history
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {todayCompleted.map((trip) => (
                <CompletedTripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatTile({ label, value, highlight = false }) {
  return (
    <div
      className={`rounded-xl p-3 text-center ${
        highlight ? "border border-orange-500/30 bg-orange-500/30" : "bg-white/10"
      }`}
    >
      <p className={`text-2xl font-extrabold ${highlight ? "text-orange-300" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{label}</p>
    </div>
  );
}

function ActiveTripCard({ post, tripActionLoading, onPickupDone, onDropDone }) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm font-extrabold uppercase tracking-wide text-blue-800">
          Trip In Progress
        </span>
      </div>
      <RouteBlock from={post.from} to={post.to} />
      <p className="mt-3 text-sm text-gray-500">
        {post.rideRequests?.length || 0} ongoing passenger{post.rideRequests?.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {post.status === "active" && (
          <button
            type="button"
            onClick={() => onPickupDone(post.id)}
            disabled={tripActionLoading === `pickup-${post.id}`}
            className="flex-1 rounded-xl bg-yellow-500 py-3 text-sm font-bold text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {tripActionLoading === `pickup-${post.id}` ? "Confirming..." : "Pickup Done"}
          </button>
        )}
        {["active", "pickup_done"].includes(post.status) && (
          <button
            type="button"
            onClick={() => onDropDone(post.id)}
            disabled={tripActionLoading === `drop-${post.id}`}
            className="flex-1 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {tripActionLoading === `drop-${post.id}` ? "Completing..." : "Drop Done"}
          </button>
        )}
      </div>
    </section>
  );
}

function RequestCard({ request, actionLoading, onAction }) {
  const passenger = request.passenger;
  const isBusy = Boolean(actionLoading);

  return (
    <article className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 transition-colors hover:border-orange-300">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white">
        {passenger?.name?.charAt(0)?.toUpperCase() || "P"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-gray-900">{passenger?.name || "Passenger"}</p>
          {passenger?.rating > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-600">
              {Number(passenger.rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <Phone className="h-3 w-3" />
          {passenger?.phone || "Phone unavailable"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <RoutePill>{request.travelPost?.from}</RoutePill>
          <span className="text-xs text-orange-400">to</span>
          <RoutePill>{request.travelPost?.to}</RoutePill>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {new Date(request.travelPost?.time).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          <span>Requested {timeAgo(request.createdAt)}</span>
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onAction(request.id, "accept")}
          disabled={isBusy}
          className="flex min-w-[76px] items-center justify-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-60"
        >
          {actionLoading === `accept-${request.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Accept
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onAction(request.id, "reject")}
          disabled={isBusy}
          className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onAction(request.id, "delete")}
          disabled={isBusy}
          className="flex items-center justify-center rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-60"
          aria-label="Delete request"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function GoodsDeliveryRequestCard({ goods, loading, onAccept }) {
  return (
    <article className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">
              Goods Delivery
            </span>
          </div>
          <h4 className="text-sm font-bold text-gray-900">{goods.item}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-700">
              {goods.from}
            </span>
            <span className="text-xs text-blue-400">to</span>
            <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-700">
              {goods.to}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{goods.weightKg}kg</span>
            <span>{goods.requester?.name}</span>
            <span>{goods.requester?.phone}</span>
          </div>
          {goods.note && (
            <p className="mt-1 text-xs italic text-gray-500">"{goods.note}"</p>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-2 md:flex-col">
          <button
            type="button"
            onClick={onAccept}
            disabled={loading}
            className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Accept"}
          </button>
          <Link
            to={`/chat/${goods.requester?.id}`}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xs font-bold text-blue-600 transition-colors"
          >
            Chat
          </Link>
        </div>
      </div>
    </article>
  );
}

function ActiveGoodsDeliveryCard({ match, actionLoading, onStatus }) {
  const request = match.goodsRequest;
  const pickupLoading = actionLoading === `pickup-${match.id}`;
  const deliveredLoading = actionLoading === `delivered-${match.id}`;
  const isPickedUp = match.status === "picked_up";

  return (
    <article className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <StatusBadge tone={isPickedUp ? "green" : "amber"}>
            {isPickedUp ? "Picked up" : "Accepted"}
          </StatusBadge>
          <h4 className="mt-2 text-sm font-bold text-gray-900">{request?.item}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <RoutePill>{request?.from}</RoutePill>
            <span className="text-xs text-blue-400">to</span>
            <RoutePill>{request?.to}</RoutePill>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {request?.weightKg}kg for {request?.requester?.name} ({request?.requester?.phone})
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2 md:flex-col">
          {!isPickedUp && (
            <button
              type="button"
              onClick={() => onStatus(match.id, "pickup")}
              disabled={Boolean(actionLoading)}
              className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
            >
              {pickupLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Picked Up"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onStatus(match.id, "delivered")}
            disabled={Boolean(actionLoading)}
            className="rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-60"
          >
            {deliveredLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delivered"}
          </button>
          <Link
            to={`/chat/${request?.requester?.id}`}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-center text-xs font-bold text-blue-600 transition-colors"
          >
            Chat
          </Link>
        </div>
      </div>
    </article>
  );
}

function ScheduledTripCard({ post, tripActionLoading, onStartTrip, onOpen }) {
  const acceptedCount = (post.rideRequests || []).filter((request) => request.status === "accepted").length;
  const pendingCount = (post.rideRequests || []).filter((request) =>
    ["pending", "requested"].includes(request.status)
  ).length;
  const hasAccepted = acceptedCount > 0;

  return (
    <article
      className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-orange-200 hover:shadow-md"
      onClick={onOpen}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <RouteBlock from={post.from} to={post.to} compact />
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge>{post.vehicleType}</StatusBadge>
          <span className="text-xs text-gray-400">{post.seatsAvailable} seats left</span>
        </div>
      </div>

      <p className="mb-3 flex items-center gap-1 text-xs text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        {new Date(post.time).toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {pendingCount > 0 && <StatusBadge tone="amber">{pendingCount} pending</StatusBadge>}
        {acceptedCount > 0 && <StatusBadge tone="green">{acceptedCount} confirmed</StatusBadge>}
        {pendingCount === 0 && acceptedCount === 0 && <StatusBadge>No requests yet</StatusBadge>}
        {post.canCarryGoods && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">
            <Package className="h-3 w-3" />
            Goods
          </span>
        )}
      </div>

      <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => onStartTrip(post.id)}
          disabled={!hasAccepted || tripActionLoading === `start-${post.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-500 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {tripActionLoading === `start-${post.id}` ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Start Trip"
          )}
        </button>
      </div>
    </article>
  );
}

function CompletedTripCard({ trip }) {
  return (
    <article className="rounded-xl border border-green-100 bg-green-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">
            {trip.from} to {trip.to}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {trip.pickedUpAt && (
              <span className="text-xs text-gray-600">
                Pickup {new Date(trip.pickedUpAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {trip.droppedAt && (
              <span className="text-xs text-gray-600">
                Drop {new Date(trip.droppedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {trip.durationMinutes && (
              <span className="text-xs text-gray-600">{trip.durationMinutes} min</span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {trip.completedPassengers} passenger{trip.completedPassengers !== 1 ? "s" : ""} completed
          </p>
        </div>
        <StatusBadge tone="green">Done</StatusBadge>
      </div>
    </article>
  );
}

function RouteBlock({ from, to, compact = false }) {
  return (
    <div className={`flex items-start gap-2 ${compact ? "" : "text-lg"}`}>
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

function RoutePill({ children }) {
  return (
    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      {children || "Unknown"}
    </span>
  );
}

function StatusBadge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

function EmptyState({ title, text, action, to }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-orange-500">
        <Clock className="h-5 w-5" />
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
