/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- BUILD SETTINGS ---
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // --- IMAGE SETTINGS ---
  // This configuration is correct for allowing images from Cloudinary
  // while disabling Next.js's default image optimization.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // --- WEBPACK SETTINGS ---
  // This is a valid way to customize the Webpack config if needed.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
    }
    return config;
  },

  // --- HEADER CONFIGURATION ---
  // This is a valid way to set global headers for specific paths.
  async headers() {
    return [
      {
        source: "/api/posts",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24 hours
          },
        ],
      },
    ];
  },
};

export default nextConfig;
