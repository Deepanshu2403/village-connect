function calculateFare(distanceKm, vehicleType) {
  const baseFare = 15;
  const rates = {
    Bike: 3,
    Scooty: 3,
    "Shared Bike": 3,
    "Auto Rickshaw": 5,
    Car: 8,
    Jeep: 6,
    Van: 5,
    "Pickup Vehicle": 7,
    "Tractor Trolley": 4,
  };
  const perKm = rates[vehicleType] || 6;
  return Math.round(baseFare + Number(distanceKm || 0) * perKm);
}

module.exports = { calculateFare };
