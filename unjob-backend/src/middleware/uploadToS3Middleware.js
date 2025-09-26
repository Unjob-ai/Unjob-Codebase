// upload.js
// middleware/uploadS3.js

// middleware/uploadMiddleWare.js
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { AppError } from "./errorHandler.js";
import dotenv from "dotenv";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import apiError from "../utils/apiError.js";
dotenv.config();

// ---------------- AWS CONFIG ----------------
export const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.S3_BUCKET_SECRET_KEY,
  },
});

// ---------------- FILE FILTER ----------------
const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const allowedDocumentTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];
const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
const allowedAudioTypes = ["audio/mpeg", "audio/wav", "audio/mp3"];

const allAllowedTypes = [
  ...allowedImageTypes,
  ...allowedDocumentTypes,
  ...allowedVideoTypes,
  ...allowedAudioTypes,
];
//-----------------------file filter-----------------//
const fileFilter = (req, file, cb) => {
  let isValidType = false;

  switch (file.fieldname) {
    case "avatar":
    case "profileImage":
    case "postImages":
      isValidType = allowedImageTypes.includes(file.mimetype);
      break;
    case "projectFiles":
    case "messageFiles":
      isValidType = allAllowedTypes.includes(file.mimetype);
      break;
    case "documents":
      isValidType = allowedDocumentTypes.includes(file.mimetype);
      break;
    default:
      isValidType = allAllowedTypes.includes(file.mimetype);
  }

  if (isValidType) cb(null, true);
  else cb(new AppError(`Unsupported file type: ${file.mimetype}`, 400), false);
};

// ---------------- FILE SIZE LIMIT ----------------//
const getFileSizeLimit = (fieldname) => {
  const limits = {
    avatar: 5 * 1024 * 1024, // 5MB
    profileImage: 5 * 1024 * 1024,
    postImages: 10 * 1024 * 1024,
    projectFiles: 50 * 1024 * 1024,
    messageFiles: 25 * 1024 * 1024,
    documents: 20 * 1024 * 1024,
  };
  return limits[fieldname] || 10 * 1024 * 1024;
};

// ---------------- S3 STORAGE ----------------//
const s3Storage = (folder = "misc") =>
  multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "private", // keep bucket private
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${folder}/${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
    },
  });

// ---------------- CREATE MULTER CONFIG ----------------//
const createMulterConfig = (fieldname, maxCount = 1, folder = "misc") => {
  return multer({
    storage: s3Storage(folder),
    fileFilter,
    limits: {
      fileSize: getFileSizeLimit(fieldname),
      files: maxCount,
    },
  });
};

// ---------------- UPLOAD CONFIGS ----------------//
const uploadConfigs = {
  avatar: createMulterConfig("avatar", 1, "profiles").single("avatar"),
  profileImage: createMulterConfig("profileImage", 1, "profiles").single(
    "profileImage"
  ),
  messageFile: createMulterConfig("messageFiles", 1, "messages").single(
    "messageFile"
  ),
  postImages: createMulterConfig("postImages", 5, "posts").array(
    "postImages",
    5
  ),
  projectFiles: createMulterConfig("projectFiles", 10, "projects").array(
    "projectFiles",
    10
  ),
  documents: createMulterConfig("documents", 5, "documents").array(
    "documents",
    5
  ),
  mixed: createMulterConfig("mixed", 10, "misc").any(),
  fields: (fields) => createMulterConfig("mixed", 10, "misc").fields(fields),
};

// Utility function to delete a file from AWS S3 bucket by its key
const deleteFileFromS3 = async (key) => {
  try {
    // Send delete command to S3
    console.log("delete")
    const response = await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      })
    );
    // Check if S3 responded with the expected status code
    if (response.$metadata.httpStatusCode !== 204) {
      throw new apiError(
        "Unexpected response from S3 while deleting file",
        500
      );
    }
  } catch (error) {
    // Handle errors during deletion
    throw new apiError("Failed to delete file from S3", 500, error);
  }
};

export { uploadConfigs, deleteFileFromS3 };