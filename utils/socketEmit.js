function emitToUser(userId, event, data) {
  try {
    if (global.io) {
      global.io.to(`user:${userId}`).emit(event, data);
    }
  } catch (err) {
    console.error("[SOCKET EMIT] Error:", err.message);
  }
}

function emitToRide(rideId, event, data) {
  try {
    if (global.io) {
      global.io.to(`ride:${rideId}`).emit(event, data);
    }
  } catch (err) {
    console.error("[SOCKET EMIT] Error:", err.message);
  }
}

module.exports = { emitToUser, emitToRide };
