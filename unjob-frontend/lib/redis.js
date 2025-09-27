import Redis from "ioredis";

// This creates a single, reusable connection instance.
const redis = new Redis(process.env.REDIS_URL);

// Create a separate client for subscribing, as required by ioredis.
export const subscriber = new Redis(process.env.REDIS_URL);

export default redis;
