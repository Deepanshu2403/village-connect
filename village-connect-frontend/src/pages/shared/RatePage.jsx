import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api/client";
import { giveRating } from "../../api/ratingApi";
import { getTravelById } from "../../api/travelApi";
import { useToast } from "../../context/ToastContext";

export default function RatePage() {
  const { ratedUserId, travelPostId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [form, setForm] = useState({ score: 5, comment: "" });
  const [tripDetails, setTripDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const res = await getTravelById(travelPostId);
        setTripDetails(res.data.post);
      } catch {
        setTripDetails(null);
      }
    };
    if (travelPostId) fetchTripDetails();
  }, [travelPostId]);

  useEffect(() => {
    const checkExistingRating = async () => {
      try {
        const historyRes = await API.get("/passenger/history");
        const rides = historyRes.data.rides || [];
        const thisRide = rides.find((ride) => ride.travelPostId === Number(travelPostId));
        if (thisRide?.hasRated) {
          addToast("You have already rated this trip", "info");
          navigate("/history", { replace: true });
        }
      } catch {
        // Ignore history lookup failures; backend still prevents duplicate ratings.
      }
    };
    if (travelPostId) checkExistingRating();
  }, [addToast, navigate, travelPostId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!form.score || Number(form.score) < 1 || Number(form.score) > 5) {
      addToast("Rating must be between 1 and 5", "error");
      return;
    }

    setLoading(true);
    try {
      await giveRating({
        ratedUserId: Number(ratedUserId),
        travelPostId: Number(travelPostId),
        score: Number(form.score),
        comment: form.comment,
      });
      addToast("Rating submitted", "success");
      navigate("/history", { replace: true });
    } catch (err) {
      addToast(err.response?.data?.error || "Could not submit rating", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-extrabold text-gray-950">Rate your trip</h1>

        {tripDetails && (
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 mt-5 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {tripDetails.user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{tripDetails.user?.name}</p>
              <p className="text-sm text-gray-500">{tripDetails.from} to {tripDetails.to}</p>
              <p className="text-xs text-gray-400">{tripDetails.vehicleType}</p>
            </div>
          </div>
        )}

        <label className="mt-5 block">
          <span className="mb-1 block text-xs font-semibold text-gray-700">Score</span>
          <select
            value={form.score}
            onChange={(event) => setForm({ ...form, score: event.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {[5, 4, 3, 2, 1].map((score) => (
              <option key={score} value={score}>
                {score} stars
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold text-gray-700">Comment</span>
          <textarea
            value={form.comment}
            onChange={(event) => setForm({ ...form, comment: event.target.value })}
            className="min-h-28 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Share feedback"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Rating"}
        </button>
      </form>
    </main>
  );
}
