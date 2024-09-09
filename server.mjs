// server.js

import express from "express";
import next from "next";
import { createLightship } from "lightship";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

async function main() {
  try {
    await app.prepare();

    const server = express();

    // Create Lightship instance
    const lightship = await createLightship({
      port: Number(process.env.LIGHTSHIP_PORT) || 9000, // Use port 9000 for liveness/readiness probes
      detectKubernetes: false, // If you're not in Kubernetes, you can turn this off
    });

    // Choke method to simulate CPU load (blocks the event loop)
    function chokeServer(duration = 15000) {
      const start = Date.now();
      console.log(`Choking the server for ${duration} ms...`);
      while (Date.now() - start < duration) {
        // Busy-wait loop to simulate blocking code
      }
      console.log("Server is no longer choked.");
    }

    // Route to trigger the choking of the server
    server.get("/choke", (req, res) => {
      chokeServer(); // Block the event loop for 5 seconds
      res.send("Server choked for 15 seconds!");
    });

    // Default Next.js handler
    server.all("*", (req, res) => {
      return handle(req, res);
    });

    // Start Express server
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);

      // Signal that the server is ready
      lightship.signalReady();
    });

    // Handle process signals for graceful shutdown
    lightship.registerShutdownHandler(() => {
      server.close(() => {
        console.log("Server is closed.");
      });
    });

    process.on("SIGTERM", () => {
      lightship.signalNotReady();
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
