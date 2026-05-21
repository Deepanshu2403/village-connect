import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function DriverNavbar() {
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
        <div className="nav-left" onClick={() => navigate("/driver")}>
          Village Connect
        </div>

        {/* CENTER */}

        
        <div className={`nav-center ${open ? "active" : ""}`}>

          <span
            className={location.pathname === "/driver" ? "active-link" : ""}
            onClick={() => navigate("/driver")}
          >
            Dashboard
          </span>

          <span
            className={location.pathname === "/create-travel" ? "active-link" : ""}
            onClick={() => navigate("/create-travel")}
          >
            Create Travel
          </span>
        
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
            onClick={() => navigate("/login", { state: { role: "passenger" } })}
          >
            Switch to Passenger
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