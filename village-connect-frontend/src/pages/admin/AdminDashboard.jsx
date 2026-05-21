import { useEffect, useMemo, useState } from "react";
import API from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatShortDateTime } from "../../utils/format";

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, tripsRes] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/admin/trips"),
      ]);
      setStats(statsRes.data.stats);
      setUsers(usersRes.data.users || []);
      setTrips(tripsRes.data.trips || []);
    } catch (err) {
      addToast(err.response?.data?.error || "Could not load admin dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const recentTrips = useMemo(() => trips.slice(0, 8), [trips]);

  const handleSuspend = async (id) => {
    if (suspendingId) return;
    setSuspendingId(id);
    try {
      const res = await API.put(`/admin/users/${id}/suspend`);
      setUsers((current) => current.map((user) => (user.id === id ? res.data.user : user)));
      addToast("User suspended", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Could not suspend user", "error");
    } finally {
      setSuspendingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-gray-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-2xl bg-gray-900 p-6 text-white shadow-md">
          <p className="font-semibold text-orange-300">Admin</p>
          <h1 className="mt-2 text-3xl font-extrabold">Village Connect Control Panel</h1>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total Users" value={stats?.totalUsers || 0} />
          <Stat label="Drivers" value={stats?.totalDrivers || 0} />
          <Stat label="Passengers" value={stats?.totalPassengers || 0} />
          <Stat label="Active Trips" value={stats?.activeTrips || 0} />
          <Stat label="Completed Trips" value={stats?.completedTrips || 0} />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
          <h2 className="text-xl font-extrabold text-gray-950">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Rating</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-3 font-semibold text-gray-900">{user.name}</td>
                    <td className="px-3 py-3 text-gray-600">{user.phone}</td>
                    <td className="px-3 py-3 capitalize text-gray-600">{user.role}</td>
                    <td className="px-3 py-3 text-gray-600">{Number(user.rating || 0).toFixed(1)}</td>
                    <td className="px-3 py-3 text-gray-600">{formatShortDateTime(user.createdAt)}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        disabled={user.suspended || suspendingId === user.id}
                        onClick={() => handleSuspend(user.id)}
                        className="rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {user.suspended ? "Suspended" : suspendingId === user.id ? "Suspending..." : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-5 shadow-md">
          <h2 className="text-xl font-extrabold text-gray-950">Recent Trips</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {recentTrips.map((trip) => (
              <article key={trip.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-950">{trip.from} to {trip.to}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {trip.user?.name || "Driver"} · {formatShortDateTime(trip.time)}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold capitalize text-gray-700">
                    {trip.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

const Stat = ({ label, value }) => (
  <article className="rounded-2xl bg-white p-5 shadow-md">
    <p className="text-3xl font-extrabold text-gray-950">{value}</p>
    <p className="mt-1 text-sm font-semibold text-gray-500">{label}</p>
  </article>
);
