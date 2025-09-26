"use client";

import ErrorFallback from "@/components/ErrorFallback";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to error reporting service
    console.error("Application Error:", error);
  }, [error]);

  return (
    <ErrorFallback 
      error={error}
      reset={reset}
      errorType="general"
    />
  );
}