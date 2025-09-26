import { clear } from "console";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000, // Wait 8 seconds before timing out
      socketTimeoutMS: 45000,
      connectTimeoutMS: 8000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("[MongoDB] Connected successfully");
        return mongoose;
      })
      .catch((error) => {
        console.error("[MongoDB] Connection failed:", error.message);
        cached.promise = null; // Reset promise so it can retry
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;

    // Log specific error information
    if (e.message.includes("ETIMEOUT")) {
      console.error(
        "[MongoDB] Connection timeout - check network and MongoDB Atlas settings"
      );
    } else if (e.message.includes("querySrv")) {
      console.error(
        "[MongoDB] DNS resolution failed - verify your connection string"
      );
    }

    throw e;
  }

  return cached.conn;
}

export default connectDB;