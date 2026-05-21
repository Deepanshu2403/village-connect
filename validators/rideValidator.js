const { z } = require("zod");

const createRideSchema = z.object({
  source: z.string(),
  destination: z.string(),
  date: z.string(),
  time: z.string(),
  availableSeats: z.number().min(1),
  sourceLat: z.number(),
  sourceLng: z.number(),
  destinationLat: z.number(),
  destinationLng: z.number()
});

module.exports = { createRideSchema };