// lib/cloudinary.js
import { v2 as cloudinary } from "cloudinary"
import { Readable } from "stream" // ✅ Add this missing import

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

function bufferToStream(buffer) {
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null) // Signifies the end of the stream
  return readable
}

/**
 * Uploads a buffer to Cloudinary using a stream.
 * @param {Buffer} buffer - The file content as a Buffer.
 * @param {string} folder - The Cloudinary folder where the file will be stored (e.g., "unjob/gigs/banners", "unjob/gigs/assets").
 * @param {string} resource_type - The type of resource being uploaded ('image', 'video', 'raw'). Defaults to 'image'.
 * @returns {Promise<string>} A Promise that resolves with the secure URL of the uploaded file on Cloudinary.
 * @throws {Error} If the upload to Cloudinary fails.
 */
export function uploadToCloudinary(buffer, folder = "unjob/gigs", resource_type = "image") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type,
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error)
          return reject(error)
        }
        console.log("Cloudinary upload success:", result.secure_url) // ✅ Add success log
        return resolve(result.secure_url)
      },
    )

    bufferToStream(buffer).pipe(stream)
  })
}
