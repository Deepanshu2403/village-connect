import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/common/Navbar";
import Landing from "../pages/Landing";
import Login from "../pages/auth/Login";
import DriverDashboard from "../pages/driver/DriverDashboard";
import TravelDetails from "../pages/driver/TravelDetails";
import PassengerDashboard from "../pages/passenger/PassengerDashboard";
import RequestItemPage from "../pages/passenger/RequestItemPage";
import Home from "../pages/shared/Home";
import CreateTravel from "../pages/shared/CreateTravel";
import CreateGoods from "../pages/shared/CreateGoods";
import RatePage from "../pages/shared/RatePage";
import TripHistory from "../pages/shared/TripHistory";
import NotificationsPage from "../pages/shared/NotificationsPage";
import SettingsPage from "../pages/shared/SettingsPage";
import ChatPage from "../pages/chat/ChatPage";
import AdminDashboard from "../pages/admin/AdminDashboard";

const dashboardPath = (role) => {
  if (role === "admin") return "/admin";
  return role === "driver" ? "/driver" : "/passenger";
};

const FullPageLoader = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-600">
    <Loader2 className="mb-3 h-8 w-8 animate-spin text-orange-500" />
    <p className="font-semibold">Loading Village Connect...</p>
  </div>
);

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={dashboardPath(user.role)} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={dashboardPath(user.role)} replace />;

  return children;
};

const NotFound = () => {
  const { user } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="rounded-2xl bg-white p-8 text-center shadow-md">
        <p className="text-5xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-500">This road does not exist in Village Connect.</p>
        <NavigateButton to={user ? dashboardPath(user.role) : "/"} label="Go back home" />
      </div>
    </main>
  );
};

const NavigateButton = ({ to, label }) => (
  <a
    href={to}
    className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
  >
    {label}
  </a>
);

export default function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const showNavbar = Boolean(user) && !["/", "/login"].includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <PrivateRoute role="driver">
              <DriverDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-travel"
          element={
            <PrivateRoute role="driver">
              <CreateTravel />
            </PrivateRoute>
          }
        />
        <Route
          path="/travel/:id"
          element={
            <PrivateRoute role="driver">
              <TravelDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/passenger"
          element={
            <PrivateRoute role="passenger">
              <PassengerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute role="passenger">
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-goods"
          element={
            <PrivateRoute role="passenger">
              <CreateGoods />
            </PrivateRoute>
          }
        />
        <Route
          path="/request-item"
          element={
            <PrivateRoute role="passenger">
              <RequestItemPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <TripHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/rate/:ratedUserId/:travelPostId"
          element={
            <PrivateRoute>
              <RatePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <NotificationsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/:userId"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
