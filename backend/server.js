require("dotenv").config();
console.log("🔑 GOOGLE_PLACES_API_KEY =", process.env.GOOGLE_PLACES_API_KEY);

process.on("uncaughtException",  err => console.error("💥 Uncaught Exception:", err));
process.on("unhandledRejection", reason => console.error("💥 Unhandled Rejection:", reason));

const express = require("express");
const cors    = require("cors");

const { healthRouter }      = require("./routes/health");
const { userRouter }        = require("./routes/user");
const { restaurantsRouter } = require("./routes/restaurants");

const app = express();
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ← ${req.method} ${req.url}`);
    next();
});

// Mount routers
app.use("/api/health", healthRouter);
app.use("/api/user",   userRouter);
app.use("/api",         restaurantsRouter);


// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

// Global error handler
app.use((err, req, res, next) => {
    console.error("💥 Server Error:", err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🗄️  Backend listening on http://localhost:${PORT}`);
});

// Keep Node alive
process.stdin.resume();
