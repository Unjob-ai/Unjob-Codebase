// middleware/cors.js
import cors from "cors"

// Define allowed origins
const getAllowedOrigins = () => {
  const baseOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://unjob.ai",
    "https://www.unjob.ai",
    "http://unjob.ai",
    "http://www.unjob.ai",
  ];

  // Add environment-specific origins
  if (process.env.CLIENT_URL) {
    baseOrigins.push(process.env.CLIENT_URL);
  }

  if (process.env.ADMIN_URL) {
    baseOrigins.push(process.env.ADMIN_URL);
  }

  // Add additional origins from environment variable
  if (process.env.ADDITIONAL_ORIGINS) {
    const additionalOrigins = process.env.ADDITIONAL_ORIGINS.split(",");
    baseOrigins.push(...additionalOrigins);
  }

  return baseOrigins;
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin && process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Access-Token",
    "X-API-Key",
    "x-client-version",
    "x-platform",
  ],
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Current-Page",
    "X-Per-Page",
    "Link",
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Development CORS (more permissive)
const devCorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  exposedHeaders: ["*"],
  maxAge: 86400,
};

// Production CORS (strict)
const prodCorsOptions = {
  ...corsOptions,
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS policy"));
    }
  },
};

// Main CORS middleware
const corsMiddleware = cors(
  process.env.NODE_ENV === "production" ? prodCorsOptions : corsOptions
);

// Development CORS middleware
const devCorsMiddleware = cors(devCorsOptions);

// Preflight middleware for complex requests
const preflightMiddleware = (req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,PUT,POST,DELETE,PATCH,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Content-Length, X-Requested-With"
    );
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400");
    res.sendStatus(200);
  } else {
    next();
  }
};

// Custom CORS middleware for specific routes
const customCors = (allowedOrigins = []) => {
  return cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  });
};

// API-specific CORS
const apiCorsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow API clients
    const apiOrigins = [
      ...allowedOrigins,
      "https://api.unjob.ai",
      "https://admin.unjob.ai",
    ];

    if (!origin || apiOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("API access not allowed from this origin"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-Client-Version",
  ],
};

const apiCorsMiddleware = cors(apiCorsOptions);

// Socket.IO CORS options
const socketCorsOptions = {
  origin: getAllowedOrigins(),
  methods: ["GET", "POST"],
  credentials: true,
};

export{
  corsMiddleware,
  devCorsMiddleware,
  preflightMiddleware,
  customCors,
  apiCorsMiddleware,
  corsOptions,
  socketCorsOptions,
  getAllowedOrigins,
};
