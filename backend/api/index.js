// Vercel serverless entry point
// Vercel cannot run app.listen() — it needs the Express app exported directly
// This file imports the compiled app and exports it as the default handler

const { app } = require("../dist/app");

module.exports = app;
