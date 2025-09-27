import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// Configure Cloudinary with your credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(process.env.CLOUDINARY_CLOUD_NAME);

export async function POST(req) {
  try {
    const body = await req.json();
    const { folder = "unjob/posts", tags = [] } = body;

    // Generate a timestamp for the signature
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Prepare the parameters to be signed
    const paramsToSign = {
      timestamp,
      folder,
      tags,
    };

    // Generate the signature on the server-side
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    // Return the signature and timestamp to the client
    return NextResponse.json({ signature, timestamp }, { status: 200 });
  } catch (error) {
    console.error("Failed to generate signature:", error);
    return NextResponse.json(
      { error: "Failed to generate signature", details: error.message },
      { status: 500 }
    );
  }
}
