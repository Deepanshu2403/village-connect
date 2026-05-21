import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Star, Trash2 } from "lucide-react";
import { getTravelById } from "../../api/travelApi";
import { acceptRideRequest, deleteRideRequest, rejectRideRequest } from "../../api/rideApi";
import { useToast } from "../../context/ToastContext";
import { formatDateTime, initials, statusLabel } from "../../utils/format";

export default function TravelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [travel, setTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchTravel = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await getTravelById(id);
      setTravel(res.data.post);
    } catch {
      setError("Failed to load travel details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTravel();
  }, [fetchTravel]);

  const updateRequest = async (requestId, action) => {
    if (actionId) return;
    setActionId(requestId);
    try {
      if (action === "accept") {
        const res = await acceptRideRequest(requestId);
        setTravel((current) =>
          current
            ? {
                ...current,
                seatsAvailable: res.data.travelPost?.seatsAvailable ?? current.seatsAvailable,
                rideRequests: (current.rideRequests || []).filter(
                  (request) => request.id !== requestId
                ),
              }
            : current
        );
        addToast("Passenger accepted", "success");
      } else {
        await rejectRideRequest(requestId);
        addToast("Passenger rejected", "info");
      }
      await fetchTravel();
    } catch (err) {
      addToast(err.response?.data?.error || "Could not update request", "error");
    } finally {
      setActionId(null);
    }
  };

  const removeRequest = async (requestId) => {
    if (deletingId) return;

    setDeletingId(requestId);
    try {
      await deleteRideRequest(requestId);
      setTravel((current) =>
        current
          ? {
              ...current,
              rideRequests: (current.rideRequests || []).filter(
                (request) => request.id !== requestId
              ),
            }
          : current
      );
      addToast("Request removed", "success");
      await fetchTravel();
    } catch (err) {
      addToast(err.response?.data?.error || "Could not remove request", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="h-56 animate-pulse rounded-3xl bg-gray-200" />
          <div className="h-52 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  if (error || !travel) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-5xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-extrabold text-gray-950">
            {error || "Travel post not found."}
          </h1>
          <button
            type="button"
            onClick={() => navigate("/driver")}
            className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const requests = travel.rideRequests || [];
  const counts = {
    total: requests.length,
    requested: requests.filter((item) => ["pending", "requested"].includes(item.status)).length,
    accepted: requests.filter((item) => item.status === "accepted").length,
    rejected: requests.filter((item) => item.status === "rejected").length,
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/driver")}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:border-orange-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="rounded-3xl bg-gray-900 p-6 text-white shadow-md sm:p-8">
          <p className="font-semibold text-orange-300">Trip details</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">
            {travel.from} to {travel.to}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{formatDateTime(travel.time)}</Badge>
            <Badge>{travel.vehicleType}</Badge>
            <Badge>{travel.seatsAvailable} seats left</Badge>
            {travel.seatsAvailable <= 0 && <Badge>Full</Badge>}
            {travel.canCarryGoods && <Badge>{travel.capacityKg} kg goods capacity</Badge>}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Total requests" value={counts.total} />
          <MiniStat label="Pending" value={counts.requested} tone="yellow" />
          <MiniStat label="Accepted" value={counts.accepted} tone="green" />
          <MiniStat label="Rejected" value={counts.rejected} tone="red" />
        </section>

        <div className="mt-10">
          <h2 className="text-2xl font-extrabold text-gray-950">Passenger requests</h2>
          <p className="mt-1 text-gray-500">Manage who travels with you.</p>
        </div>

        {requests.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-md">
            <p className="text-5xl">👥</p>
            <h3 className="mt-4 text-xl font-extrabold text-gray-950">No requests yet</h3>
            <p className="mt-2 text-gray-500">Passenger requests will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <article key={request.id} className="rounded-2xl bg-white p-6 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-orange-100 font-extrabold text-orange-700">
                      {initials(request.passenger?.name)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-950">{request.passenger?.name}</h3>
                      <p className="text-sm text-gray-500">{request.passenger?.phone}</p>
                      <p className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {request.passenger?.rating ? Number(request.passenger.rating).toFixed(1) : "No rating"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["pending", "requested"].includes(request.status) && (
                    <>
                      <button
                        type="button"
                        disabled={actionId === request.id}
                        onClick={() => updateRequest(request.id, "accept")}
                        className="rounded-xl bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                      >
                        {actionId === request.id ? "Working..." : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={actionId === request.id}
                        onClick={() => updateRequest(request.id, "reject")}
                        className="rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {["pending", "requested", "rejected"].includes(request.status) && (
                    <button
                      type="button"
                      disabled={deletingId === request.id}
                      onClick={() => removeRequest(request.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:border-red-300 hover:text-red-600 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === request.id ? "Removing..." : "Delete"}
                    </button>
                  )}
                  <Link
                    to={`/chat/${request.passenger?.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold hover:border-orange-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const Badge = ({ children }) => (
  <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/20">
    {children}
  </span>
);

const MiniStat = ({ label, value, tone = "gray" }) => {
  const colors = {
    gray: "text-gray-950",
    yellow: "text-yellow-600",
    green: "text-green-600",
    red: "text-red-600",
  };
  return (
    <article className="rounded-2xl bg-white p-6 shadow-md">
      <p className={`text-3xl font-extrabold ${colors[tone]}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-gray-500">{label}</p>
    </article>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-700",
    requested: "bg-yellow-100 text-yellow-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {statusLabel(status)}
    </span>
  );
};
