import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getDriverDashboard } from "../../api/dashboardApi";
import { acceptRideRequest, markDropDone, markPickupDone, rejectRideRequest, startTrip } from "../../api/rideApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function DriverDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState({
    activePost: null,
    scheduledPosts: [],
    todayCompleted: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestActionId, setRequestActionId] = useState(null);
  const [tripActionLoading, setTripActionLoading] = useState(null);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setError("");
    try {
      const res = await getDriverDashboard();
      setData({
        activePost: res.data.activePost || null,
        scheduledPosts: res.data.scheduledPosts || [],
        todayCompleted: res.data.todayCompleted || [],
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

  const handleRequestAction = async (requestId, action) => {
    if (requestActionId) return;
    setRequestActionId(`${action}-${requestId}`);
    try {
      if (action === "accept") {
        await acceptRideRequest(requestId);
        addToast("Ride request accepted", "success");
      } else {
        await rejectRideRequest(requestId);
        addToast("Ride request rejected", "info");
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

  const { activePost, scheduledPosts = [], stats = {} } = data || {};
  const todayCompleted = data?.todayCompleted || [];
  const pendingRequests = scheduledPosts.flatMap((post) =>
    (post.rideRequests || [])
      .filter((request) => ["pending", "requested"].includes(request.status))
      .map((request) => ({ ...request, travelPost: post }))
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-orange-600">Driver dashboard</p>
          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Hello, {user?.name}</h1>
              <p className="text-sm text-gray-500">
                {stats.pendingCount || 0} pending requests, {stats.scheduledCount || 0} scheduled trips
              </p>
            </div>
            <Link
              to="/create-travel"
              className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
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

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">Pending Requests</h2>
          {pendingRequests.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No pending requests.</p>
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

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Scheduled Trips</h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
              {scheduledPosts.length}
            </span>
          </div>
          {scheduledPosts.length === 0 ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              No future scheduled trips.
            </p>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <ScheduledTripCard
                  key={post.id}
                  post={post}
                  tripActionLoading={tripActionLoading}
                  onStartTrip={handleStartTrip}
                />
              ))}
            </div>
          )}
        </section>

        {todayCompleted.length > 0 && (
          <div className="rounded-2xl bg-white shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Completed Today</h2>
            <div className="space-y-3">
              {todayCompleted.map((trip) => {
                const duration = trip.durationMinutes;
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
                  <div key={trip.id} className="rounded-xl bg-green-50 border border-green-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {trip.from} to {trip.to}
                        </p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {pickupTime && (
                            <span className="text-xs text-gray-600">
                              Picked up: <strong>{pickupTime}</strong>
                            </span>
                          )}
                          {dropTime && (
                            <span className="text-xs text-gray-600">
                              Dropped: <strong>{dropTime}</strong>
                            </span>
                          )}
                          {duration && (
                            <span className="text-xs text-gray-600">
                              Duration: <strong>{duration} min</strong>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {trip.completedPassengers} passenger{trip.completedPassengers !== 1 ? "s" : ""} completed
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold flex-shrink-0">
                        Done
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              to="/history"
              className="block text-center text-sm text-orange-500 hover:text-orange-600 font-semibold mt-4 transition-colors"
            >
              View full trip history
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function ActiveTripCard({ post, tripActionLoading, onPickupDone, onDropDone }) {
  return (
    <section className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
        <span className="text-sm font-extrabold uppercase tracking-wide text-blue-800">
          Trip In Progress
        </span>
      </div>
      <p className="text-lg font-extrabold text-gray-900">{post.from} to {post.to}</p>
      <p className="mt-1 text-sm text-gray-500">
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
      {post.status === "pickup_done" && (
        <p className="mt-3 rounded-xl bg-yellow-50 px-4 py-3 text-xs font-semibold text-yellow-800">
          Pickup is confirmed. Complete drop after passengers reach the destination.
        </p>
      )}
    </section>
  );
}

function RequestCard({ request, actionLoading, onAction }) {
  return (
    <article className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{request.passenger?.name || "Passenger"}</p>
          <p className="text-xs text-gray-500">{request.passenger?.phone}</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">
            {request.travelPost.from} to {request.travelPost.to}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => onAction(request.id, "accept")}
            className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {actionLoading === `accept-${request.id}` ? "Accepting..." : "Accept"}
          </button>
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => onAction(request.id, "reject")}
            className="rounded-xl bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            {actionLoading === `reject-${request.id}` ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ScheduledTripCard({ post, tripActionLoading, onStartTrip }) {
  const acceptedCount = (post.rideRequests || []).filter((request) => request.status === "accepted").length;
  const pendingCount = (post.rideRequests || []).filter((request) =>
    ["pending", "requested"].includes(request.status)
  ).length;

  return (
    <article className="rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{post.from} to {post.to}</p>
          <p className="text-xs text-gray-500">
            {new Date(post.time).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{post.vehicleType}</Badge>
            <Badge>{post.seatsAvailable} seats left</Badge>
            {acceptedCount > 0 && <Badge>{acceptedCount} accepted</Badge>}
            {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
          </div>
        </div>
        <button
          type="button"
          disabled={acceptedCount === 0 || tripActionLoading === `start-${post.id}`}
          onClick={() => onStartTrip(post.id)}
          className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {tripActionLoading === `start-${post.id}` ? "Starting..." : "Start Trip"}
        </button>
      </div>
    </article>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
      {children}
    </span>
  );
}
