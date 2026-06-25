// Root-level Vercel serverless entry point
// Vercel looks for handlers in /api at the project root
// This file builds the backend and exports the Express app

const { app } = require("../backend/dist/app");
module.exports = app;
