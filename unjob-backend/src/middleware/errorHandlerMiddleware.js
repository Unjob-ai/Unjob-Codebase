import apiError from "../utils/apiError.js"; // Adjust path as needed
import { deleteFileFromS3 } from "./uploadToS3Middleware.js";

async function errorHandler(err, req, res, next) {
  try {
    const keysToDelete = [];
    // Single file
    if (req.file?.key) {
      keysToDelete.push(req.file.key);
    }

    // Multiple files
    if (req.files && typeof req.files === "object") {

      for (const fieldFiles of Object.values(req.files)) {
        if (Array.isArray(fieldFiles)) {
          for (const file of fieldFiles) {
            if (file?.key) keysToDelete.push(file.key);
          }
        }
      }
    }
    // Delete all files concurrently
    if (keysToDelete.length > 0) {
      await Promise.all(keysToDelete.map((key) => deleteFileFromS3(key)));
    }
  } catch (cleanupErr) {
    console.error("Failed to cleanup uploaded files:", cleanupErr);
  }

  // Send proper response
  if (err instanceof apiError) {
    res.status(err.status).json({
      status: err.status,
      success: false,
      message: err.message,
      errors: err.errors || [],
      data: err.data || null,
    });
  } else {
    console.error(err); // log unexpected errors
    res.status(500).json({
      status: 500,
      success: false,
      message: "Unexpected error occurred",
      error: err.message || err,
    });
  }
}

export default errorHandler;
