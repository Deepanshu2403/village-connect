import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CarFront, Copy, Package, ShieldCheck, UsersRound } from "lucide-react";
import { resetPassword, sendOTP, verifyOTP } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const initialLogin = { phone: "", password: "" };
const initialSignup = { name: "", phone: "", password: "", role: "passenger" };
const initialForgot = { phone: "", newPassword: "" };

function OTPInput({ value, onChange, onComplete }) {
  const inputs = useRef([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const nextDigits = [...digits];
    nextDigits[index] = val.slice(-1);
    const nextValue = nextDigits.join("");
    onChange(nextValue);

    if (val && index < 5) inputs.current[index + 1]?.focus();
    if (nextValue.length === 6) onComplete?.(nextValue);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array(6)
        .fill(0)
        .map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[index] || ""}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className="h-12 w-11 rounded-xl border-2 border-gray-200 text-center text-lg font-bold transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        ))}
    </div>
  );
}

export default function Login() {
  const { login, signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminMode = Boolean(location.state?.adminHint);
  const selectedRole = isAdminMode ? "admin" : location.state?.role === "driver" ? "driver" : "passenger";
  const initialMode = isAdminMode ? "login" : location.state?.mode === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState({ ...initialSignup, role: selectedRole });
  const [forgotForm, setForgotForm] = useState(initialForgot);
  const [signupStep, setSignupStep] = useState("phone");
  const [forgotStep, setForgotStep] = useState("phone");
  const [otpValue, setOtpValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [displayOtp, setDisplayOtp] = useState("");
  const [otpCopied, setOtpCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(initialMode);
    setSignupForm((current) => ({ ...current, role: selectedRole }));
    setDisplayOtp("");
    setOtpValue("");
    setOtpCopied(false);
  }, [initialMode, selectedRole]);

  useEffect(() => {
    if (!isAdminMode) return;
    setMode("login");
    setError("");
    setDisplayOtp("");
    setOtpValue("");
    setOtpCopied(false);
    setResendCountdown(0);
  }, [isAdminMode]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => setResendCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const cleanPhone = mode === "forgot" ? forgotForm.phone : signupForm.phone;
  const otpPurpose = mode === "forgot" ? "forgot_password" : "signup";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setOtpValue("");
    setDisplayOtp("");
    setOtpCopied(false);
    setResendCountdown(0);
    if (nextMode === "signup") setSignupStep("phone");
    if (nextMode === "forgot") setForgotStep("phone");
  };

  const validatePhone = (phone) =>
    /^[6-9]\d{9}$/.test(phone) ? null : "Enter a valid 10-digit mobile number";

  const handleSendOTP = async () => {
    if (otpSending) return;
    if (isAdminMode) return;
    const phoneError = validatePhone(cleanPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setError("");
    setDisplayOtp("");
    setOtpCopied(false);
    setOtpSending(true);
    try {
      const res = await sendOTP(cleanPhone, otpPurpose);
      const generatedOtp = res.data?.otp ?? res.data?.data?.otp ?? "";

      if (generatedOtp) {
        setDisplayOtp(generatedOtp);
        setOtpValue(generatedOtp);
        addToast("OTP generated successfully", "otp", { otp: generatedOtp });
      } else {
        setOtpValue("");
      }
      setResendCountdown(60);
      if (mode === "forgot") setForgotStep("otp_verify");
      else setSignupStep("otp_verify");
    } catch (err) {
      const message = err.response?.data?.error || "Could not send OTP";
      setError(message);
      addToast(message, "error");
    } finally {
      setOtpSending(false);
    }
  };

  const handleCopyOtp = () => {
    if (!displayOtp) return;

    navigator.clipboard?.writeText(displayOtp).then(() => {
      setOtpCopied(true);
      window.setTimeout(() => setOtpCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = displayOtp;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setOtpCopied(true);
      window.setTimeout(() => setOtpCopied(false), 2000);
    });
  };

  const handleVerifyOTP = async (nextOtp = otpValue) => {
    if (otpVerifying || nextOtp.length !== 6) return;
    setError("");
    setOtpVerifying(true);
    try {
      await verifyOTP(cleanPhone, nextOtp, otpPurpose);
      addToast("Phone verified", "success");
      setDisplayOtp("");
      setOtpCopied(false);
      if (mode === "forgot") setForgotStep("newpass");
      else setSignupStep("details");
    } catch (err) {
      const message = err.response?.data?.error || "Could not verify OTP";
      setError(message);
      addToast(message, "error");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    const phoneError = validatePhone(loginForm.phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (!loginForm.password) {
      setError("Password is required");
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
        user.role === "admin" ? "/admin" : user.role === "driver" ? "/driver" : "/passenger",
        { replace: true }
      );
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
    if (isAdminMode) return;
    setError("");

    if (signupStep !== "details") {
      setError("Please verify OTP before creating your account");
      return;
    }
    if (signupForm.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (signupForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signup(signupForm);
      addToast("Account created. Please login.", "success");
      setLoginForm({ phone: signupForm.phone, password: "" });
      setSignupForm({ ...initialSignup, role: selectedRole });
      setSignupStep("phone");
      switchMode("login");
    } catch (err) {
      const message = err.response?.data?.error || "Signup failed. Please try again.";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (isAdminMode) return;
    setError("");

    if (forgotStep !== "newpass") {
      setError("Please verify OTP before resetting your password");
      return;
    }
    if (forgotForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(forgotForm.phone, forgotForm.newPassword);
      addToast("Password reset successfully. Please login.", "success");
      setLoginForm({ phone: forgotForm.phone, password: "" });
      setForgotForm(initialForgot);
      setForgotStep("phone");
      switchMode("login");
    } catch (err) {
      const message = err.response?.data?.error || "Could not reset password";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6">
      <div className="w-full max-w-115 sm:max-w-130 lg:max-w-180">
        <div className="mb-5 flex flex-col items-center justify-center text-center">
          <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-sm text-white shadow-sm">
              VC
            </span>
            <span className="text-lg">Village Connect</span>
          </Link>
          <p className="mt-2 text-xs text-gray-500">Travel, transport and communication</p>
        </div>

        <div className={`grid gap-5 ${isAdminMode ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
            {isAdminMode ? (
              <div className="mb-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Administrator access</p>
                <h1 className="mt-1 text-2xl font-black text-gray-900">Admin Login</h1>
                <p className="mt-2 text-sm text-gray-500">Sign in to manage the platform dashboard.</p>
              </div>
            ) : (
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
                {["login", "signup"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => switchMode(tab)}
                    className={`flex items-center justify-center rounded-lg py-2 text-sm font-semibold transition-all ${
                      mode === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    {tab === "signup" ? "Sign Up" : "Login"}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-5 text-center">
              <p className="text-sm font-semibold text-gray-900">
                {isAdminMode
                  ? "Use your administrator credentials"
                  : mode === "login"
                    ? "Enter your credentials"
                    : mode === "forgot"
                      ? "Reset your password"
                      : signupStep === "phone"
                        ? "Verify your mobile number"
                        : signupStep === "otp_verify"
                          ? "Enter the OTP"
                          : "Create your account"}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-600">
                {error}
              </div>
            )}

            {(mode === "login" || isAdminMode) && (
              <form className="space-y-4" onSubmit={handleLogin} noValidate>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                    {isAdminMode ? (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    ) : selectedRole === "driver" ? (
                      <CarFront className="h-3.5 w-3.5" />
                    ) : (
                      <UsersRound className="h-3.5 w-3.5" />
                    )}
                    {isAdminMode
                      ? "Administrator Login"
                      : selectedRole === "driver"
                        ? "Driver Dashboard"
                        : "Passenger Dashboard"}
                  </div>
                </div>

                <Field label="Phone Number">
                  <input
                    type="tel"
                    value={loginForm.phone}
                    maxLength={10}
                    onChange={(event) =>
                      setLoginForm({ ...loginForm, phone: event.target.value.replace(/\D/g, "") })
                    }
                    className={inputClass}
                    placeholder={isAdminMode ? "Administrator mobile number" : "10 digit number"}
                  />
                </Field>

                <Field label="Password">
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    className={inputClass}
                    placeholder={isAdminMode ? "Administrator password" : "Enter password"}
                  />
                </Field>

                <button type="submit" disabled={loading} className={buttonClass}>
                  {loading ? "Logging in..." : isAdminMode ? "Administrator Login" : "Login"}
                </button>

                {!isAdminMode && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                  >
                    Forgot Password?
                  </button>
                )}
              </form>
            )}

            {!isAdminMode && mode === "signup" && (
              <form className="space-y-4" onSubmit={handleSignup} noValidate>
                {signupStep === "phone" && (
                  <>
                    <Field label="Phone Number">
                      <input
                        type="tel"
                        value={signupForm.phone}
                        maxLength={10}
                        onChange={(event) =>
                          setSignupForm({
                            ...signupForm,
                            phone: event.target.value.replace(/\D/g, ""),
                          })
                        }
                        className={inputClass}
                        placeholder="10 digit number"
                      />
                    </Field>
                    <button type="button" disabled={otpSending} onClick={handleSendOTP} className={buttonClass}>
                      {otpSending ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </>
                )}

                {signupStep === "otp_verify" && (
                  <OTPPanel
                    phone={signupForm.phone}
                    value={otpValue}
                    setValue={setOtpValue}
                    onComplete={handleVerifyOTP}
                    onVerify={() => handleVerifyOTP()}
                    onResend={handleSendOTP}
                    verifying={otpVerifying}
                    sending={otpSending}
                    countdown={resendCountdown}
                    displayOtp={displayOtp}
                    otpCopied={otpCopied}
                    onCopyOtp={handleCopyOtp}
                  />
                )}

                {signupStep === "details" && (
                  <>
                    <VerifiedPhone phone={signupForm.phone} />
                    <Field label="Full Name">
                      <input
                        type="text"
                        value={signupForm.name}
                        onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })}
                        className={inputClass}
                        placeholder="Your name"
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        type="password"
                        value={signupForm.password}
                        onChange={(event) =>
                          setSignupForm({ ...signupForm, password: event.target.value })
                        }
                        className={inputClass}
                        placeholder="Minimum 6 characters"
                      />
                    </Field>
                    <RolePicker form={signupForm} setForm={setSignupForm} />
                    <button type="submit" disabled={loading} className={buttonClass}>
                      {loading ? "Creating..." : "Create Account"}
                    </button>
                  </>
                )}
              </form>
            )}

            {!isAdminMode && mode === "forgot" && (
              <form className="space-y-4" onSubmit={handleResetPassword} noValidate>
                {forgotStep === "phone" && (
                  <>
                    <Field label="Phone Number">
                      <input
                        type="tel"
                        value={forgotForm.phone}
                        maxLength={10}
                        onChange={(event) =>
                          setForgotForm({ ...forgotForm, phone: event.target.value.replace(/\D/g, "") })
                        }
                        className={inputClass}
                        placeholder="Registered mobile number"
                      />
                    </Field>
                    <button type="button" disabled={otpSending} onClick={handleSendOTP} className={buttonClass}>
                      {otpSending ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </>
                )}

                {forgotStep === "otp_verify" && (
                  <OTPPanel
                    phone={forgotForm.phone}
                    value={otpValue}
                    setValue={setOtpValue}
                    onComplete={handleVerifyOTP}
                    onVerify={() => handleVerifyOTP()}
                    onResend={handleSendOTP}
                    verifying={otpVerifying}
                    sending={otpSending}
                    countdown={resendCountdown}
                    displayOtp={displayOtp}
                    otpCopied={otpCopied}
                    onCopyOtp={handleCopyOtp}
                  />
                )}

                {forgotStep === "newpass" && (
                  <>
                    <VerifiedPhone phone={forgotForm.phone} />
                    <Field label="New Password">
                      <input
                        type="password"
                        value={forgotForm.newPassword}
                        onChange={(event) =>
                          setForgotForm({ ...forgotForm, newPassword: event.target.value })
                        }
                        className={inputClass}
                        placeholder="Minimum 6 characters"
                      />
                    </Field>
                    <button type="submit" disabled={loading} className={buttonClass}>
                      {loading ? "Resetting..." : "Reset Password"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-sm font-semibold text-gray-500 hover:text-orange-600"
                >
                  Back to login
                </button>
              </form>
            )}

            {!isAdminMode && (
              <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-gray-500">
                <Package className="h-3.5 w-3.5 text-orange-500" />
                <span>Trips, parcels and chat connected together</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

const OTPPanel = ({
  phone,
  value,
  setValue,
  onComplete,
  onVerify,
  onResend,
  verifying,
  sending,
  countdown,
  displayOtp,
  otpCopied,
  onCopyOtp,
}) => (
  <div className="space-y-4">
    <p className="text-xs text-gray-500">OTP sent to +91 {phone}</p>
    {displayOtp && (
      <div className="rounded-2xl border-2 border-orange-500 bg-slate-800 px-5 py-4">
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Your OTP Code
        </p>
        <div className="mb-3 text-center font-mono text-4xl font-black tracking-[0.18em] text-white">
          {displayOtp}
        </div>
        <button
          type="button"
          onClick={onCopyOtp}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${
            otpCopied ? "bg-green-600" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          <Copy className="h-4 w-4" />
          {otpCopied ? "Copied" : "Copy OTP"}
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
          Valid for 10 minutes
        </p>
      </div>
    )}
    <OTPInput value={value} onChange={setValue} onComplete={onComplete} />
    <button type="button" disabled={verifying || value.length !== 6} onClick={onVerify} className={buttonClass}>
      {verifying ? "Verifying..." : "Verify OTP"}
    </button>
    <button
      type="button"
      onClick={onResend}
      disabled={countdown > 0 || sending}
      className="text-sm font-semibold text-orange-500 hover:text-orange-600 disabled:text-gray-400"
    >
      {countdown > 0 ? `Resend in ${countdown}s` : sending ? "Sending..." : "Resend OTP"}
    </button>
  </div>
);

const VerifiedPhone = ({ phone }) => (
  <div className="rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
    Phone verified: +91 {phone}
  </div>
);

const RolePicker = ({ form, setForm }) => (
  <div>
    <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
      Select Role
    </p>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setForm({ ...form, role: "passenger" })}
        className={`rounded-xl border px-3 py-3 text-center transition-all ${
          form.role === "passenger"
            ? "border-orange-300 bg-orange-50 text-orange-700"
            : "border-gray-200 bg-white text-gray-700"
        }`}
      >
        <UsersRound className="mx-auto mb-1 h-4 w-4" />
        <p className="text-xs font-semibold">Passenger</p>
      </button>
      <button
        type="button"
        onClick={() => setForm({ ...form, role: "driver" })}
        className={`rounded-xl border px-3 py-3 text-center transition-all ${
          form.role === "driver"
            ? "border-orange-300 bg-orange-50 text-orange-700"
            : "border-gray-200 bg-white text-gray-700"
        }`}
      >
        <CarFront className="mx-auto mb-1 h-4 w-4" />
        <p className="text-xs font-semibold">Driver</p>
      </button>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <label className="block text-left">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition-all placeholder:text-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

const buttonClass =
  "flex w-full items-center justify-center rounded-xl bg-orange-500 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-orange-600 disabled:opacity-60";
