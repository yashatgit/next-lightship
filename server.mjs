// server.js

import express from "express";
import next from "next";
import { createLightship } from "lightship";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

const CHOKE_DURATION = 15000;

// Choke method to simulate CPU load (blocks the event loop)
function chokeServer(duration = CHOKE_DURATION) {
  const start = Date.now();
  console.log(`Choking the server for ${duration} ms...`);
  while (Date.now() - start < duration) {
    // Busy-wait loop to simulate blocking code
  }
  console.log("Server is no longer choked.");
}

async function main() {
  try {
    await app.prepare();

    const server = express();

    // Create Lightship instance
    const lightship = await createLightship({
      port: Number(process.env.LIGHTSHIP_PORT) || 9000, // Use port 9000 for liveness/readiness probes
      detectKubernetes: false, // Turn off if not using Kubernetes
    });

    // Route to trigger the choking of the server
    server.get("/choke", (req, res) => {
      chokeServer(); // Block the event loop for 5 seconds
      res.send("Server choked for 5 seconds!");
    });

    // Default Next.js handler
    server.all("*", (req, res) => {
      return handle(req, res);
    });

    const httpServer = server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
      lightship.signalReady();
    });

    // Handle process signals for graceful shutdown
    const shutdown = () => {
      console.log("Gracefully shutting down...");

      // Signal Lightship that the server is no longer ready
      lightship.signalNotReady();

      httpServer.close(() => {
        console.log("HTTP server closed.");

        // Signal Lightship that the server is ready to shutdown
        lightship.shutdown();
      });
    };

    // Handle SIGTERM (graceful termination)
    process.on("SIGTERM", () => {
      console.log("Received SIGTERM, initiating graceful shutdown...");
      shutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      console.log("Received SIGINT (Ctrl+C), initiating graceful shutdown...");
      shutdown();
    });

    lightship.registerShutdownHandler(() => {
      console.log("Lightship is shutting down.");
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
