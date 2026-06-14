import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const pageStyle = {
  minHeight: "100vh",
  background: "#0a0f1e",
  color: "white",
  overflowX: "hidden",
};

const shellStyle = {
  maxWidth: "1080px",
  margin: "0 auto",
  width: "100%",
  padding: "0 20px",
};

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 56,
  padding: "16px 28px",
  borderRadius: 14,
  textDecoration: "none",
  fontSize: 16,
  fontWeight: 800,
  transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease",
};

const vcMarkStyle = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fb923c",
  fontWeight: 900,
  letterSpacing: "-0.04em",
};

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") navigate("/admin", { replace: true });
    else if (user.role === "driver") navigate("/driver", { replace: true });
    else navigate("/passenger", { replace: true });
  }, [user, navigate]);

  return (
    <main style={pageStyle}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          height: 60,
          background: "rgba(10,15,30,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            ...shellStyle,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link to="/" style={{ textDecoration: "none", color: "white", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>
              <span>Village</span>
              <span style={{ color: "#fb923c" }}>Connect</span>
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              to="/login"
              state={{ adminHint: true }}
              style={{
                ...buttonStyle,
                minHeight: 40,
                padding: "10px 18px",
                fontSize: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.12)",
                color: "white",
              }}
            >
              Administrator
            </Link>
            <div style={vcMarkStyle}>VC</div>
          </div>
        </div>
      </header>

      <section
        style={{
          minHeight: "calc(100vh - 60px)",
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.28), transparent 28%), radial-gradient(circle at 80% 30%, rgba(59,130,246,0.2), transparent 26%), radial-gradient(circle at 50% 80%, rgba(34,197,94,0.12), transparent 24%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ ...shellStyle, position: "relative", zIndex: 1, textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(249,115,22,0.25)",
              background: "rgba(249,115,22,0.12)",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              color: "#fb923c",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            🌾 Rural Mobility Platform
          </div>

          <h1
            style={{
              margin: "18px auto 0",
              maxWidth: 860,
              fontSize: "clamp(40px, 8vw, 72px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "white",
            }}
          >
            Rides. Deliveries.
            <br />
            From Rural to Town.
          </h1>

          <p
            style={{
              margin: "18px auto 0",
              maxWidth: 620,
              fontSize: "clamp(16px, 2vw, 20px)",
              lineHeight: 1.5,
              color: "#cbd5e1",
            }}
          >
            Community-powered transport for rural India.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              maxWidth: 460,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Link
              to="/login"
              state={{ role: "passenger", mode: "signup" }}
              style={{
                ...buttonStyle,
                background: "linear-gradient(135deg, #f97316, #fb923c)",
                color: "white",
                boxShadow: "0 12px 32px rgba(249,115,22,0.35)",
              }}
            >
              Find a Ride →
            </Link>
            <Link
              to="/login"
              state={{ role: "driver", mode: "signup" }}
              style={{
                ...buttonStyle,
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            >
              Offer a Ride
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
