import { config } from "dotenv";
import { Redis } from "@upstash/redis";

config({ path: ".env.local" });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  console.error("URL:", url ? "set" : "MISSING");
  console.error("TOKEN:", token ? "set" : "MISSING");
  process.exit(1);
}

const redis = new Redis({ url, token });

async function test() {
  try {
    const setResult = await redis.set("test:upstash:ping", "pong", { ex: 60 });
    console.log("SET result:", setResult);

    const getResult = await redis.get("test:upstash:ping");
    console.log("GET result:", getResult);

    const delResult = await redis.del("test:upstash:ping");
    console.log("DEL result:", delResult);

    console.log("Upstash Redis connection OK");
  } catch (error) {
    console.error("Upstash Redis connection FAILED:", error);
    process.exit(1);
  }
}

test();
