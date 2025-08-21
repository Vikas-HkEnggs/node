import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { sequelize } from "../config/db.js";
import router from "./routes/routes.js";
import cookieParser from "cookie-parser";

const app = express();

// Sync the database and tables
sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced"))
  .catch((err) => console.error("Error syncing database:", err));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://hkenggs-dev-vikas-kashyaps-projects-92bd43fd.vercel.app",
  "https://hkconsultantsenggs.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.options("*", cors());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use("/api/v1", router);

// Example route
app.get("/api-data", (req, res) => {
  res.send("Server is running");
});

// app.get("/notifications", (req, res) => {
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   setInterval(() => {
//       const message = `New Notification at ${new Date().toLocaleTimeString()}`;
//       res.write(`data: ${message}\n\n`); // Send event data
//   }, 5000); // Send notification every 5 seconds
// });

// Global error handler (should be the last middleware)
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
