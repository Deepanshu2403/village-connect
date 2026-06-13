import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarCheck,
  CarFront,
  Menu,
  Package,
  Power,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import {
  cancelAdminRide,
  deleteAdminGoods,
  deleteAdminRide,
  deleteAdminUser,
  getAdminBookings,
  getAdminGoods,
  getAdminRides,
  getAdminStats,
  getAdminUsers,
  toggleUserSuspend,
} from "../../api/adminApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const navItems = [
  { to: "/admin", label: "Overview", icon: BarChart3 },
  { to: "/admin/users", label: "Users", icon: UsersRound },
  { to: "/admin/rides", label: "Rides", icon: CarFront },
  { to: "/admin/goods", label: "Goods", icon: Package },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
];

const statusTone = {
  scheduled: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  pickup_done: "bg-green-50 text-green-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  requested: "bg-amber-50 text-amber-700",
  accepted: "bg-green-50 text-green-700",
  ongoing: "bg-blue-50 text-blue-700",
  in_transit: "bg-blue-50 text-blue-700",
  picked_up: "bg-blue-50 text-blue-700",
  delivered: "bg-purple-50 text-purple-700",
  rejected: "bg-red-50 text-red-700",
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not set";

const errorMessage = (err, fallback = "Something went wrong") =>
  err?.response?.data?.error || err?.message || fallback;

function Badge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusTone[value] || "bg-gray-100 text-gray-600"}`}>
      {String(value || "unknown").replace("_", " ")}
    </span>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-extrabold text-gray-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 border-t border-gray-100 p-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm font-semibold text-gray-500">
        {page} of {pages}
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activePath = location.pathname.replace(/\/$/, "");
  const closeDrawer = () => setDrawerOpen(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-100 text-gray-950">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-4 z-[90] rounded-xl bg-slate-900 p-3 text-white shadow-lg lg:hidden"
        aria-label="Open admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className={`fixed inset-y-0 left-0 z-[110] w-72 transform bg-slate-950 text-white shadow-2xl transition-transform lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-extrabold">Village Connect</p>
                <p className="text-xs font-semibold text-slate-400">Admin Panel</p>
              </div>
            </div>
            <button type="button" onClick={closeDrawer} className="rounded-lg p-2 text-slate-300 lg:hidden" aria-label="Close admin navigation">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const itemPath = item.to.replace(/\/$/, "");
              const active = itemPath === "/admin" ? activePath === "/admin" : activePath.startsWith(itemPath);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeDrawer}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-orange-500 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <p className="mb-3 truncate text-sm font-bold">{user?.name || "Admin"}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              <Power className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {drawerOpen && <button type="button" className="fixed inset-0 z-[100] bg-black/40 lg:hidden" onClick={closeDrawer} aria-label="Close admin navigation overlay" />}

      <section className="min-h-screen px-4 py-20 lg:ml-72 lg:px-8 lg:py-8">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="users" element={<Users />} />
          <Route path="rides" element={<Rides />} />
          <Route path="goods" element={<Goods />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </section>
    </main>
  );
}

function Overview() {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then((res) => setStats(res.data.stats))
      .catch((err) => addToast(errorMessage(err, "Failed to load admin stats"), "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  const cards = useMemo(
    () => [
      ["Users", stats?.users?.total || 0, `${stats?.users?.drivers || 0} drivers, ${stats?.users?.passengers || 0} passengers`],
      ["Rides", stats?.rides?.total || 0, `${stats?.rides?.active || 0} active, ${stats?.rides?.scheduled || 0} scheduled`],
      ["Goods", stats?.goods?.total || 0, `${stats?.goods?.pending || 0} pending, ${stats?.goods?.delivered || 0} delivered`],
      ["Bookings", stats?.system?.bookings || 0, "Total ride requests"],
      ["Messages", stats?.system?.messages || 0, "Chat messages"],
      ["Notifications", stats?.system?.notifications || 0, "System notifications"],
    ],
    [stats]
  );

  return (
    <div>
      <PageHeader title="Overview" subtitle="Live operational snapshot for Village Connect." />
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value, detail]) => (
            <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-gray-500">{label}</p>
              <p className="mt-2 text-4xl font-extrabold text-gray-950">{value}</p>
              <p className="mt-2 text-sm text-gray-500">{detail}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Users() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({ role, search: search || undefined, page });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      addToast(errorMessage(err, "Failed to load users"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, role, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const suspend = async (user) => {
    try {
      const res = await toggleUserSuspend(user.id);
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, suspended: res.data.suspended } : item
        )
      );
      addToast(res.data.suspended ? "User suspended" : "User activated", "success");
    } catch (err) {
      addToast(errorMessage(err, "Action failed"), "error");
    }
  };

  const remove = async () => {
    try {
      await deleteAdminUser(confirm.id);
      addToast("User deleted", "success");
      setConfirm(null);
      fetchUsers();
    } catch (err) {
      addToast(errorMessage(err, "Delete failed"), "error");
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${total} registered users`}>
        <Filters search={search} setSearch={setSearch} setPage={setPage}>
          <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">
            <option value="all">All roles</option>
            <option value="driver">Drivers</option>
            <option value="passenger">Passengers</option>
          </select>
        </Filters>
      </PageHeader>
      <DataList loading={loading} empty="No users found">
        {users.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-gray-500">
            No users found
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-950">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.phone}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{user.role}</td>
                      <td className="px-4 py-3">{Number(user.rating || 0).toFixed(1)}</td>
                      <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3"><Badge value={user.suspended ? "cancelled" : "active"} /></td>
                      <td className="px-4 py-3">
                        <RowActions
                          primaryLabel={user.suspended ? "Activate" : "Suspend"}
                          onPrimary={() => suspend(user)}
                          onDelete={() => setConfirm(user)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} pages={pages} onPage={setPage} />
            </div>
            <div className="space-y-3 md:hidden">
              {users.map((user) => (
                <MobileCard key={user.id} title={user.name} subtitle={user.phone} badge={user.role}>
                  <p>Joined: {formatDate(user.createdAt)}</p>
                  <p>Rating: {Number(user.rating || 0).toFixed(1)}</p>
                  <RowActions
                    primaryLabel={user.suspended ? "Activate" : "Suspend"}
                    onPrimary={() => suspend(user)}
                    onDelete={() => setConfirm(user)}
                  />
                </MobileCard>
              ))}
              <Pagination page={page} pages={pages} onPage={setPage} />
            </div>
          </>
        )}
      </DataList>
      {confirm && (
        <ConfirmDialog
          title="Delete user?"
          message={`Delete ${confirm.name} and their related records? This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirm(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Rides() {
  const { addToast } = useToast();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState(null);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminRides({ status, search: search || undefined, page });
      setRides(res.data.rides || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      addToast(errorMessage(err, "Failed to load rides"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, search, status]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const act = async () => {
    try {
      if (confirm.action === "cancel") await cancelAdminRide(confirm.id);
      if (confirm.action === "delete") await deleteAdminRide(confirm.id);
      addToast("Ride updated", "success");
      setConfirm(null);
      fetchRides();
    } catch (err) {
      addToast(errorMessage(err, "Action failed"), "error");
    }
  };

  return (
    <RecordPage
      title="Rides"
      total={total}
      loading={loading}
      empty="No rides found"
      rows={rides}
      page={page}
      pages={pages}
      setPage={setPage}
      search={search}
      setSearch={setSearch}
      status={status}
      setStatus={setStatus}
      statusOptions={["scheduled", "active", "pickup_done", "completed", "cancelled", "expired"]}
      columns={["Route", "Driver", "Time", "Bookings", "Status", "Actions"]}
      renderRow={(ride) => [
        <RouteText key="route" from={ride.from} to={ride.to} />,
        ride.user?.name || "Driver",
        formatDate(ride.time),
        ride._count?.rideRequests || 0,
        <Badge key="badge" value={ride.status} />,
        <RowActions key="actions" primaryLabel="Cancel" onPrimary={() => setConfirm({ action: "cancel", id: ride.id })} onDelete={() => setConfirm({ action: "delete", id: ride.id })} />,
      ]}
      renderCard={(ride) => (
        <MobileCard key={ride.id} title={`${ride.from} to ${ride.to}`} subtitle={ride.user?.name} badge={ride.status}>
          <p>Time: {formatDate(ride.time)}</p>
          <p>Bookings: {ride._count?.rideRequests || 0}</p>
          <RowActions primaryLabel="Cancel" onPrimary={() => setConfirm({ action: "cancel", id: ride.id })} onDelete={() => setConfirm({ action: "delete", id: ride.id })} />
        </MobileCard>
      )}
    >
      {confirm && (
        <ConfirmDialog
          title={confirm.action === "cancel" ? "Cancel ride?" : "Delete ride?"}
          message={confirm.action === "cancel" ? "This will cancel the ride and related pending bookings." : "This will delete the ride after detaching related records."}
          confirmLabel={confirm.action === "cancel" ? "Cancel Ride" : "Delete"}
          onCancel={() => setConfirm(null)}
          onConfirm={act}
        />
      )}
    </RecordPage>
  );
}

function Goods() {
  const { addToast } = useToast();
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirm, setConfirm] = useState(null);

  const fetchGoods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminGoods({ status, page });
      setGoods(res.data.goods || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      addToast(errorMessage(err, "Failed to load goods"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, status]);

  useEffect(() => {
    fetchGoods();
  }, [fetchGoods]);

  const cancel = async () => {
    try {
      await deleteAdminGoods(confirm.id);
      addToast("Goods request cancelled", "success");
      setConfirm(null);
      fetchGoods();
    } catch (err) {
      addToast(errorMessage(err, "Action failed"), "error");
    }
  };

  return (
    <RecordPage
      title="Goods"
      total={total}
      loading={loading}
      empty="No goods requests found"
      rows={goods}
      page={page}
      pages={pages}
      setPage={setPage}
      status={status}
      setStatus={setStatus}
      statusOptions={["pending", "accepted", "in_transit", "delivered", "cancelled"]}
      columns={["Item", "Route", "Requester", "Weight", "Status", "Actions"]}
      renderRow={(item) => [
        item.item,
        <RouteText key="route" from={item.from} to={item.to} />,
        item.requester?.name || "Passenger",
        `${item.weightKg} kg`,
        <Badge key="badge" value={item.status} />,
        <RowActions key="actions" primaryLabel="Cancel" hideDelete onPrimary={() => setConfirm(item)} />,
      ]}
      renderCard={(item) => (
        <MobileCard key={item.id} title={item.item} subtitle={`${item.from} to ${item.to}`} badge={item.status}>
          <p>Requester: {item.requester?.name}</p>
          <p>Weight: {item.weightKg} kg</p>
          <RowActions primaryLabel="Cancel" hideDelete onPrimary={() => setConfirm(item)} />
        </MobileCard>
      )}
    >
      {confirm && (
        <ConfirmDialog
          title="Cancel goods request?"
          message={`Cancel the goods request for ${confirm.item}?`}
          confirmLabel="Cancel Request"
          onCancel={() => setConfirm(null)}
          onConfirm={cancel}
        />
      )}
    </RecordPage>
  );
}

function Bookings() {
  const { addToast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminBookings({ status, page });
      setBookings(res.data.bookings || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      addToast(errorMessage(err, "Failed to load bookings"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, page, status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return (
    <RecordPage
      title="Bookings"
      total={total}
      loading={loading}
      empty="No bookings found"
      rows={bookings}
      page={page}
      pages={pages}
      setPage={setPage}
      status={status}
      setStatus={setStatus}
      statusOptions={["pending", "requested", "accepted", "ongoing", "completed", "cancelled", "rejected", "expired"]}
      columns={["Route", "Passenger", "Driver", "Requested", "Status"]}
      renderRow={(booking) => [
        <RouteText key="route" from={booking.travelPost?.from} to={booking.travelPost?.to} />,
        booking.passenger?.name || "Passenger",
        booking.travelPost?.user?.name || "Driver",
        formatDate(booking.createdAt),
        <Badge key="badge" value={booking.status} />,
      ]}
      renderCard={(booking) => (
        <MobileCard key={booking.id} title={`${booking.travelPost?.from} to ${booking.travelPost?.to}`} subtitle={booking.passenger?.name} badge={booking.status}>
          <p>Driver: {booking.travelPost?.user?.name}</p>
          <p>Requested: {formatDate(booking.createdAt)}</p>
        </MobileCard>
      )}
    />
  );
}

function Filters({ search, setSearch, setPage, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {setSearch && (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-orange-400 sm:w-56"
          />
        </label>
      )}
      {children}
    </div>
  );
}

function DataList({ loading, empty, children }) {
  if (loading) return <Spinner />;
  if (!children) return <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-gray-500">{empty}</div>;
  return children;
}

function RecordPage({
  title,
  total,
  loading,
  empty,
  rows,
  page,
  pages,
  setPage,
  search,
  setSearch,
  status,
  setStatus,
  statusOptions = [],
  columns,
  renderRow,
  renderCard,
  children,
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={`${total} total`}>
        <Filters search={search} setSearch={setSearch} setPage={setPage}>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold">
            <option value="all">All status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option.replace("_", " ")}</option>
            ))}
          </select>
        </Filters>
      </PageHeader>
      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-gray-500">{empty}</div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    {renderRow(row).map((cell, index) => (
                      <td key={`${row.id}-${columns[index]}`} className="px-4 py-3 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pages={pages} onPage={setPage} />
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => renderCard(row))}
            <Pagination page={page} pages={pages} onPage={setPage} />
          </div>
        </>
      )}
      {children}
    </div>
  );
}

function RowActions({ primaryLabel, onPrimary, onDelete, hideDelete = false }) {
  return (
    <div className="flex justify-end gap-2">
      {onPrimary && (
        <button type="button" onClick={onPrimary} className="justify-center rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">
          {primaryLabel}
        </button>
      )}
      {!hideDelete && (
        <button type="button" onClick={onDelete} className="justify-center rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function MobileCard({ title, subtitle, badge, children }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-extrabold text-gray-950">{title}</h2>
          {subtitle && <p className="mt-1 truncate text-xs font-semibold text-gray-500">{subtitle}</p>}
        </div>
        <Badge value={badge} />
      </div>
      <div className="mt-3 space-y-2 text-xs font-medium text-gray-500">{children}</div>
    </article>
  );
}

function RouteText({ from, to }) {
  return (
    <div>
      <p className="font-bold text-gray-950">{from || "Unknown"}</p>
      <p className="text-xs font-semibold text-gray-500">to {to || "Unknown"}</p>
    </div>
  );
}
