import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CarFront, Package, UsersRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const initialLogin = { phone: "", password: "" };
const initialSignup = { name: "", phone: "", password: "", role: "passenger" };

export default function Login() {
  const { login, signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedRole = location.state?.role === "driver" ? "driver" : "passenger";
  const initialMode = location.state?.mode === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(initialMode);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState({ ...initialSignup, role: selectedRole });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setSignupForm((current) => ({ ...current, role: selectedRole }));
  }, [initialMode, selectedRole]);

  const validateSignup = () => {
    if (signupForm.name.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[6-9]\d{9}$/.test(signupForm.phone)) return "Enter a valid 10-digit mobile number";
    if (signupForm.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const validateLogin = () => {
    if (!/^[6-9]\d{9}$/.test(loginForm.phone)) return "Enter a valid 10-digit mobile number";
    if (!loginForm.password) return "Password is required";
    return null;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    const validationError = validateLogin();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const user = await login(loginForm);
      if (user.role !== selectedRole) {
        addToast(
          `This phone number is registered as a ${user.role}. Opening the correct dashboard.`,
          "info"
        );
      } else {
        addToast(`Welcome back, ${user.name}`, "success");
      }
      navigate(user.role === "admin" ? "/admin" : user.role === "driver" ? "/driver" : "/passenger", { replace: true });
    } catch (err) {
      const message = err.response?.data?.error || "Login failed. Please check your details.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    const validationError = validateSignup();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await signup(signupForm);
      addToast("Account created. Please login.", "success");
      setLoginForm({ phone: signupForm.phone, password: "" });
      setSignupForm({ ...initialSignup, role: selectedRole });
      setMode("login");
    } catch (err) {
      const message = err.response?.data?.error || "Signup failed. Please try again.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden min-h-full flex-col justify-end overflow-hidden bg-gray-900 p-10 text-white lg:flex">
          <img
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1100&q=80"
            alt="Village field road"
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
          <div className="relative">
            <Link to="/" className="mb-12 inline-flex items-center gap-3 font-extrabold">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500">
                VC
              </span>
              Village Connect
            </Link>
            <h1 className="text-5xl font-extrabold leading-tight">
              One account for trips, goods, messages, and trust.
            </h1>
            <p className="mt-5 text-lg leading-8 text-gray-200">
              Built for rural routes where every seat, parcel, and update matters.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-[92%] max-w-[420px] mx-auto">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 font-extrabold text-gray-950 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-500 text-white">
                VC
              </span>
              Village Connect
            </Link>

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
              {["login", "signup"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMode(tab);
                    setError("");
                    setSignupForm((current) => ({ ...current, role: selectedRole }));
                  }}
                  className={`rounded-xl py-3 font-bold capitalize transition ${
                    mode === tab ? "bg-white text-gray-950 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {tab === "signup" ? "Sign Up" : "Login"}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-gray-950">
                {mode === "login"
                  ? selectedRole === "driver"
                    ? "Driver login"
                    : "Passenger login"
                  : "Create your account"}
              </h2>
              <p className="mt-2 text-gray-500">
                {mode === "login"
                  ? "Login with your phone number and password."
                  : "Choose how you want to use Village Connect."}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {mode === "login" ? (
              <form className="space-y-3" onSubmit={handleLogin} noValidate>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Login dashboard</label>
                  <RoleCard active icon={selectedRole === "driver" ? CarFront : UsersRound} title={selectedRole === "driver" ? "Driver" : "Passenger"} text="Selected from landing page" />
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Your saved account role decides the dashboard after login.
                  </p>
                </div>
                <Field label="Phone number">
                  <input
                    type="tel"
                    value={loginForm.phone}
                    maxLength={10}
                    onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value.replace(/\D/g, "") })}
                    className={inputClass}
                    placeholder="10 digit mobile number"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className={inputClass}
                    placeholder="Enter password"
                  />
                </Field>
                <button
                  type="submit"
                  disabled={loading}
                  className={buttonClass}
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleSignup} noValidate>
                <Field label="Full name">
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    type="tel"
                    value={signupForm.phone}
                    maxLength={10}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value.replace(/\D/g, "") })}
                    className={inputClass}
                    placeholder="10 digit mobile number"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className={inputClass}
                    placeholder="At least 6 characters"
                  />
                </Field>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">I want to</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RoleCard
                      active={signupForm.role === "passenger"}
                      icon={UsersRound}
                      title="Travel / send"
                      text="Passenger"
                      onClick={() => setSignupForm({ ...signupForm, role: "passenger" })}
                    />
                    <RoleCard
                      active={signupForm.role === "driver"}
                      icon={CarFront}
                      title="Offer rides"
                      text="Driver"
                      onClick={() => setSignupForm({ ...signupForm, role: "driver" })}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={buttonClass}
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Package className="h-4 w-4 text-orange-500" />
              Trips, goods, chat, notifications, and ratings are tied to this account.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
    {children}
  </label>
);

const inputClass = "w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent";
const buttonClass = "w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const RoleCard = ({ active, icon: Icon, title, text, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border p-4 text-left transition ${
      active
        ? "border-orange-400 bg-orange-50 text-orange-700"
        : "border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-300"
    }`}
  >
    <Icon className="mb-3 h-6 w-6" />
    <p className="font-bold">{title}</p>
    <p className="text-sm opacity-80">{text}</p>
  </button>
);
