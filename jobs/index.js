const { registerCleanupRequestsJob } = require("./cleanupRequests");
const { registerCleanupRidesJob } = require("./cleanupRides");

const tasks = [];

const registerJob = (name, register) => {
  try {
    const task = register();
    tasks.push({ name, task });
    console.log("[CRON]", `${name} registered`);
  } catch (err) {
    console.error("[CRON]", `${name} failed to register`, {
      error: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }
};

const startCronJobs = () => {
  if (tasks.length > 0) {
    console.log("[CRON] Jobs already registered");
    return tasks;
  }

  registerJob("cleanupRequests", registerCleanupRequestsJob);
  registerJob("cleanupRides", registerCleanupRidesJob);
  return tasks;
};

const stopCronJobs = () => {
  for (const { name, task } of tasks) {
    try {
      task.stop?.();
      task.destroy?.();
      console.log("[CRON]", `${name} stopped`);
    } catch (err) {
      console.error("[CRON]", `${name} failed to stop`, { error: err.message });
    }
  }

  tasks.length = 0;
};

module.exports = {
  startCronJobs,
  stopCronJobs,
};
