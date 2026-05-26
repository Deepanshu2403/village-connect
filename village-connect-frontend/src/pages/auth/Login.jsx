import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CarFront, Package, UsersRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const initialLogin = {
  phone: "",
  password: "",
};

const initialSignup = {
  name: "",
  phone: "",
  password: "",
  role: "passenger",
};

export default function Login() {
  const { login, signup } = useAuth();
  const { addToast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();

  const selectedRole =
    location.state?.role === "driver" ? "driver" : "passenger";

  const initialMode =
    location.state?.mode === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);

  const [loginForm, setLoginForm] = useState(initialLogin);

  const [signupForm, setSignupForm] = useState({
    ...initialSignup,
    role: selectedRole,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);

    setSignupForm((current) => ({
      ...current,
      role: selectedRole,
    }));
  }, [initialMode, selectedRole]);

  const validateSignup = () => {
    if (signupForm.name.trim().length < 2) {
      return "Name must be at least 2 characters";
    }

    if (!/^[6-9]\d{9}$/.test(signupForm.phone)) {
      return "Enter a valid 10-digit mobile number";
    }

    if (signupForm.password.length < 6) {
      return "Password must be at least 6 characters";
    }

    return null;
  };

  const validateLogin = () => {
    if (!/^[6-9]\d{9}$/.test(loginForm.phone)) {
      return "Enter a valid 10-digit mobile number";
    }

    if (!loginForm.password) {
      return "Password is required";
    }

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

      navigate(
        user.role === "admin"
          ? "/admin"
          : user.role === "driver"
          ? "/driver"
          : "/passenger",
        { replace: true }
      );
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "Login failed. Please check your details.";

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

      setLoginForm({
        phone: signupForm.phone,
        password: "",
      });

      setSignupForm({
        ...initialSignup,
        role: selectedRole,
      });

      setMode("login");
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "Signup failed. Please try again.";

      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
      <div className="w-full max-w-[360px]">

        {/* LOGO */}
        <div className="mb-5 flex flex-col items-center justify-center text-center">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-gray-900"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-sm text-white shadow-sm">
              VC
            </span>

            <span className="text-lg">Village Connect</span>
          </Link>

          <p className="mt-2 text-xs text-gray-500">
            Travel, transport and communication
          </p>
        </div>

        {/* CARD */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">

          {/* TABS */}
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            {["login", "signup"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError("");

                  setSignupForm((current) => ({
                    ...current,
                    role: selectedRole,
                  }));
                }}
                className={`flex items-center justify-center rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {tab === "signup" ? "Sign Up" : "Login"}
              </button>
            ))}
          </div>

          {/* HEADING */}
          {/* HEADING */}
<div className="mb-5 text-center">
  <p className="text-sm font-semibold text-black-500">
    {mode === "login"
      ? "Enter your credentials"
      : "Create your Village Connect account"}
  </p>
</div>

          {/* ERROR */}
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-600">
              {error}
            </div>
          )}

          {/* LOGIN */}
          {mode === "login" ? (
            <form
              className="space-y-4"
              onSubmit={handleLogin}
              noValidate
            >
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                  {selectedRole === "driver" ? (
                    <CarFront className="h-3.5 w-3.5" />
                  ) : (
                    <UsersRound className="h-3.5 w-3.5" />
                  )}

                  {selectedRole === "driver"
                    ? "Driver Dashboard"
                    : "Passenger Dashboard"}
                </div>
              </div>

              <Field label="Phone Number">
                <input
                  type="tel"
                  value={loginForm.phone}
                  maxLength={10}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className={inputClass}
                  placeholder="10 digit number"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      password: e.target.value,
                    })
                  }
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
            <form
              className="space-y-4"
              onSubmit={handleSignup}
              noValidate
            >
              <Field label="Full Name">
                <input
                  type="text"
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm({
                      ...signupForm,
                      name: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Your name"
                />
              </Field>

              <Field label="Phone Number">
                <input
                  type="tel"
                  value={signupForm.phone}
                  maxLength={10}
                  onChange={(e) =>
                    setSignupForm({
                      ...signupForm,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className={inputClass}
                  placeholder="10 digit number"
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm({
                      ...signupForm,
                      password: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="Minimum 6 characters"
                />
              </Field>

              {/* ROLE */}
              <div>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Select Role
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSignupForm({
                        ...signupForm,
                        role: "passenger",
                      })
                    }
                    className={`rounded-xl border px-3 py-3 text-center transition-all ${
                      signupForm.role === "passenger"
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <UsersRound className="mx-auto mb-1 h-4 w-4" />

                    <p className="text-xs font-semibold">
                      Passenger
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSignupForm({
                        ...signupForm,
                        role: "driver",
                      })
                    }
                    className={`rounded-xl border px-3 py-3 text-center transition-all ${
                      signupForm.role === "driver"
                        ? "border-orange-300 bg-orange-50 text-orange-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <CarFront className="mx-auto mb-1 h-4 w-4" />

                    <p className="text-xs font-semibold">
                      Driver
                    </p>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={buttonClass}
              >
                {loading
                  ? "Creating..."
                  : "Create Account"}
              </button>
            </form>
          )}

          {/* FOOTER */}
          <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-gray-500">
            <Package className="h-3.5 w-3.5 text-orange-500" />

            <span>
              Trips, parcels and chat connected together
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

const Field = ({ label, children }) => (
  <label className="block text-left">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
    </span>

    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const buttonClass =
  "flex w-full items-center justify-center rounded-xl bg-orange-500 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-60";