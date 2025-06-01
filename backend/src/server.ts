// src/server.ts
import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import eventsRouter from "./routes/events";
import notificationsRouter from "./routes/notifications";
import cors from "cors";

export function initExpressApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PATCH"],
      allowedHeaders: ["Content-Type"],
    })
  );

  // Basic middleware
  app.use(bodyParser.json());

  app.use("/event", eventsRouter);
  app.use("/notifications", notificationsRouter);

  // Fallback 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}
