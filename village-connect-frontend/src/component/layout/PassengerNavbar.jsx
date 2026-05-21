import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PassengerNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="navbar-container">
      <div className="navbar">

        {/* LEFT */}
        <div className="nav-left" onClick={() => navigate("/passenger")}>
          Village Connect
        </div>

        {/* CENTER */}
        <div className={`nav-center ${open ? "active" : ""}`}>


  {/* TRAVEL */}
  <span
    className={location.pathname === "/home" ? "active-link" : ""}
    onClick={() => navigate("/home")}
  >
    Travel
  </span>

  {/* GOODS */}
  <span
    className={location.pathname === "/create-goods" ? "active-link" : ""}
    onClick={() => navigate("/create-goods")}
  >
    Goods
  </span>

  {/* HISTORY */}
  <span
    className={location.pathname === "/history" ? "active-link" : ""}
    onClick={() => navigate("/history")}
  >
    History
  </span>

</div>
        {/* RIGHT */}
        <div className="nav-right">
          <button
            className="switch-btn"
            onClick={() => navigate("/login", { state: { role: "driver" } })}
          >
            Switch to Driver
          </button>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        {/* MOBILE */}
        <div className="hamburger" onClick={() => setOpen(!open)}>
          ☰
        </div>

      </div>
    </div>
  );
}