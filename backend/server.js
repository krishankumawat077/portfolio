// ════════════════════════════════════════════
//  CAMPUS CONNECT — BACKEND
//  Node.js + Express + MongoDB Atlas
// ════════════════════════════════════════════
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ───────────────────────────────

app.use(helmet());

// CORS — allow your frontend
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL, // e.g. https://yourusername.github.io
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS blocked: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json({ limit: "10kb" }));

// Rate limit — 5 signups per 15 min per IP (prevent spam)
const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many registrations from this IP. Please try again later.",
  },
});

// ── MONGOOSE MODEL ────────────────────────────

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    college: { type: String, required: true, trim: true, maxlength: 200 },
    year: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true, maxlength: 150 },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    interests: { type: String, trim: true, maxlength: 300, default: "" },
    why: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

// Prevent duplicate emails
memberSchema.index({ email: 1 }, { unique: true });

const Member = mongoose.model("Member", memberSchema);

// ── ROUTES ───────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "🎓 Campus Connect API is running!" });
});

// POST /api/members — Register a new member
app.post("/api/members", joinLimiter, async (req, res) => {
  try {
    const { fullName, email, college, year, branch, phone, interests, why } =
      req.body;

    // Server-side validation
    const errors = {};
    if (!fullName?.trim() || fullName.trim().length < 2)
      errors.fullName = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim()))
      errors.email = "Valid email is required.";
    if (!college?.trim() || college.trim().length < 2)
      errors.college = "College name is required.";
    if (!year?.trim()) errors.year = "Year of study is required.";
    if (!branch?.trim() || branch.trim().length < 2)
      errors.branch = "Branch/major is required.";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    // Check duplicate email
    const exists = await Member.findOne({ email: email.trim().toLowerCase() });
    if (exists) {
      return res
        .status(409)
        .json({
          message: `This email is already registered! Welcome back, ${exists.fullName.split(" ")[0]} 👋`,
        });
    }

    const member = await Member.create({
      fullName,
      email,
      college,
      year,
      branch,
      phone,
      interests,
      why,
    });

    res.status(201).json({
      message: "Successfully joined Campus Connect!",
      member: {
        id: member._id,
        fullName: member.fullName,
        college: member.college,
        year: member.year,
        branch: member.branch,
        createdAt: member.createdAt,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "This email is already registered!" });
    }
    console.error("POST /api/members error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// GET /api/members — Retrieve latest members
app.get("/api/members", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);

    const [members, count] = await Promise.all([
      Member.find({})
        .select("fullName college year branch interests createdAt") // never return email/phone publicly
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Member.countDocuments(),
    ]);

    res.json({ count, members });
  } catch (err) {
    console.error("GET /api/members error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error." });
});

// ── START SERVER ─────────────────────────────

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error(
      "❌  MONGODB_URI missing! Create a .env file (see .env.example).",
    );
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      family: 4,
    });
    console.log("✅  MongoDB Atlas connected");
    app.listen(PORT, () =>
      console.log(`🚀  Server → http://localhost:${PORT}`),
    );
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
