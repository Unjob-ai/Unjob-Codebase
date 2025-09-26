// components/providers/HealthCheckProvider.js
"use client"; // This must be a client component to use useEffect

import { useEffect } from "react";

export const HealthCheckProvider = ({ children }) => {
  useEffect(() => {
    // This function will run once when the component mounts
    const checkApiHealth = async () => {
      try {
        const response = await fetch(
          "https://unjob-socket.onrender.com/api/health"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("✅ API Health Check Successful:", data);
      } catch (error) {
        console.error("❌ API Health Check Failed:", error);
      }
    };

    checkApiHealth();
  }, []); // The empty dependency array [] ensures this runs only once

  return <>{children}</>;
};
