import cloudinary from "@/lib/cloudinary";
import { Readable } from "stream";

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: "unjob/gigs",
      transformation: [
        { width: 800, height: 600, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ],
    };

    const uploadOptions = { ...defaultOptions, ...options };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        return resolve(result.secure_url);
      }
    );
    
    bufferToStream(buffer).pipe(stream);
  });
}