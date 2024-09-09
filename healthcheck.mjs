const interval = 2000; // Time interval in ms (e.g., 5000 ms = 5 seconds)

async function checkLiveness() {
  try {
    const response = await fetch(`http://127.0.0.1:${9000}/live`);

    if (response.ok) {
      console.log(`[${new Date().toISOString()}] Liveness check successful! Status code: ${response.status}`);
    } else {
      console.error(`[${new Date().toISOString()}] Liveness check failed. Status code: ${response.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error checking liveness: ${error.message}`);
  }
}
setInterval(checkLiveness, interval);
