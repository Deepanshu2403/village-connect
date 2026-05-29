import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, MessageCircle, Package, Phone } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useDriverLocationWatch } from "../../hooks/useDriverLocationWatch";
import LiveTripMap from "../map/LiveTripMap";

export default function ActiveGoodsCard({ match, onUpdate }) {
  const { addToast } = useToast();
  const { on, off } = useSocket() || {};
  const isInTransit = match.status === "picked_up";
  const driverId = match.driver?.id;

  const { driverLocation, isStale } = useDriverLocationWatch(
    driverId,
    match.travelPost?.id,
    isInTransit
  );

  useEffect(() => {
    if (!on || !off) return undefined;

    const handlePickedUp = (data) => {
      if (Number(data.matchId) === Number(match.id)) {
        addToast("Your goods have been picked up.", "success");
        onUpdate?.();
      }
    };

    const handleDelivered = (data) => {
      if (Number(data.matchId) === Number(match.id)) {
        addToast("Goods delivered successfully.", "success");
        onUpdate?.();
      }
    };

    on("goods:picked_up", handlePickedUp);
    on("goods:delivered", handleDelivered);
    return () => {
      off("goods:picked_up", handlePickedUp);
      off("goods:delivered", handleDelivered);
    };
  }, [addToast, match.id, off, on, onUpdate]);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-blue-50">
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {isInTransit ? (
            <>
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Goods In Transit
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-green-700">
                Delivery Accepted
              </span>
            </>
          )}
        </div>

        <div className="mb-3 rounded-xl bg-white p-3">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Package className="h-4 w-4 text-blue-500" />
            {match.goodsRequest?.item}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {match.goodsRequest?.from}
            </span>
            <span className="text-xs text-gray-400">to</span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              {match.goodsRequest?.to}
            </span>
          </div>
          {match.pickedUpAt && (
            <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              Picked up at{" "}
              {new Date(match.pickedUpAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white">
              {match.driver?.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">{match.driver?.name}</p>
              <p className="truncate text-xs text-gray-400">{match.driver?.phone}</p>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <a
              href={`tel:${match.driver?.phone}`}
              className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-green-600"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
            <Link
              to={`/chat/${match.driver?.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </Link>
          </div>
        </div>
      </div>

      {isInTransit && driverLocation && (
        <div className="px-4 pb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Tracking driver live
          </p>
          <LiveTripMap
            driverLocation={driverLocation}
            isStale={isStale}
            fromLat={match.goodsRequest?.fromLat || match.travelPost?.fromLat}
            fromLng={match.goodsRequest?.fromLng || match.travelPost?.fromLng}
            toLat={match.goodsRequest?.toLat || match.travelPost?.toLat}
            toLng={match.goodsRequest?.toLng || match.travelPost?.toLng}
            height={240}
          />
        </div>
      )}
    </div>
  );
}
