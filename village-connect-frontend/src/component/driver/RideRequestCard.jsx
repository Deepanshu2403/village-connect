export default function RideRequestCard({
  request,
  onAccept,
  onReject
}) {
  return (
    <div className="request-card">

      <div className="request-user">

        <div className="request-avatar">
          {request.passenger.name.charAt(0)}
        </div>

        <div>
          <h4>{request.passenger.name}</h4>
          <p>{request.passenger.phone}</p>
        </div>

      </div>

      <div className="request-details">
        <h3>
          {request.travelPost.from} →
          {request.travelPost.to}
        </h3>

        <p>
          {new Date(
            request.travelPost.time
          ).toLocaleString()}
        </p>
      </div>

      <div className="request-actions">

        <button
          className="accept-btn"
          onClick={() => onAccept(request.id)}
        >
          Accept
        </button>

        <button
          className="reject-btn"
          onClick={() => onReject(request.id)}
        >
          Reject
        </button>

      </div>

    </div>
  );
}