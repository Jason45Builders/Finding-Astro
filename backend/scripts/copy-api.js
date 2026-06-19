const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "api");
const dest = path.join(__dirname, "..", "dist", "api");

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
fs.readdirSync(src).forEach((f) => fs.copyFileSync(path.join(src, f), path.join(dest, f)));
console.log("Copied api/ → dist/api/");
