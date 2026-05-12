import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  // ── Graceful Shutdown ──────────────────────────────────────────
  // Khi nhận SIGTERM (từ Docker/Heroku/PM2), đóng server sạch sẽ
  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });

  // ── Unhandled Promise Rejections ───────────────────────────────
  process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err.message);
    server.close(() => process.exit(1));
  });
});
