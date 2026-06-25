// Vercel serverless entry point
// Exports the Express app directly — Vercel cannot run app.listen()
const { app } = require("../dist/app");
module.exports = app;
