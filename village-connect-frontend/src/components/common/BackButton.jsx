import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function BackButton({ label = "Back", to = null, className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (to) {
      navigate(to);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    const path = location.pathname;
    if (path.startsWith("/travel/")) navigate("/driver");
    else if (path.startsWith("/chat/")) navigate(-1);
    else if (path.startsWith("/rate/")) navigate("/passenger");
    else if (path === "/create-travel") navigate("/driver");
    else if (path === "/create-goods") navigate("/passenger");
    else if (path === "/notifications") navigate(-1);
    else if (path === "/history") navigate(-1);
    else navigate("/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 py-1 text-sm font-semibold text-gray-600 transition-colors hover:text-orange-500 ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
