import { useState } from "react";
import { AlertTriangle, Loader2, LogOut, Phone, ShieldAlert, Star, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteAccount } from "../../api/authApi";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      addToast('Please type "DELETE" to confirm', "error");
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      addToast("Account deleted successfully", "info");
      navigate("/", { replace: true });
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to delete account", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-5">
          <BackButton label="Back" />
          <h1 className="mt-2 text-xl font-extrabold text-gray-900">Settings</h1>
        </div>

        <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
            Account
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-extrabold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-gray-900">{user?.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <Phone className="h-3.5 w-3.5" />
                {user?.phone}
              </p>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                user?.role === "driver"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-orange-100 text-orange-700"
              }`}>
                <UserRound className="h-3 w-3" />
                {user?.role === "driver" ? "Driver" : user?.role === "admin" ? "Admin" : "Passenger"}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-gray-900">
                <Star className="h-4 w-4 text-yellow-500" />
                {user?.rating ? Number(user.rating).toFixed(1) : "-"}
              </p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="text-lg font-extrabold text-gray-900">{user?.totalRatings || 0}</p>
              <p className="text-xs text-gray-500">Total Ratings</p>
            </div>
          </div>
        </section>

        <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
            Preferences
          </h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">Notifications</p>
              <p className="text-xs text-gray-400">Ride updates and messages</p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
              Enabled
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-red-600">
            Danger Zone
          </h2>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Delete Account</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Permanently delete your account and related data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-500 hover:text-white"
            >
              Delete
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Delete account?</h3>
              <p className="mt-2 text-sm text-gray-500">
                This permanently deletes your profile and related records.
                <strong className="text-red-600"> This cannot be undone.</strong>
              </p>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-xs font-bold text-gray-700">
                Type <span className="font-black text-red-600">DELETE</span> to confirm
              </span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="Type DELETE here"
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 font-mono text-sm focus:border-red-400 focus:outline-none"
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
