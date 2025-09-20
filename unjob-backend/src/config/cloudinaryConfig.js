// config/cloudinary.js
import cloudinary from "cloudinary";
import  multer from "multer";
import path from "path";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Local storage configuration as fallback
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";

    switch (file.fieldname) {
      case "avatar":
      case "profileImage":
        uploadPath += "profiles/";
        break;
      case "postImages":
        uploadPath += "posts/";
        break;
      case "projectFiles":
        uploadPath += "projects/";
        break;
      case "messageFiles":
        uploadPath += "messages/";
        break;
      case "documents":
        uploadPath += "documents/";
        break;
      default:
        uploadPath += "misc/";
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
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

  if (isValidType) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

// File size limits
const getFileSizeLimit = (fieldname) => {
  const limits = {
    avatar: 5 * 1024 * 1024, // 5MB
    profileImage: 5 * 1024 * 1024, // 5MB
    postImages: 10 * 1024 * 1024, // 10MB
    projectFiles: 50 * 1024 * 1024, // 50MB
    messageFiles: 25 * 1024 * 1024, // 25MB
    documents: 20 * 1024 * 1024, // 20MB
  };

  return limits[fieldname] || 10 * 1024 * 1024; // Default 10MB
};

// Create multer configuration
const createMulterConfig = (fieldname, maxCount = 1) => {
  return multer({
    storage: localStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: getFileSizeLimit(fieldname),
      files: maxCount,
    },
  });
};

// Upload configurations
const uploadConfigs = {
  avatar: createMulterConfig("avatar").single("avatar"),
  profileImage: createMulterConfig("profileImage").single("profileImage"),
  messageFile: createMulterConfig("messageFiles").single("messageFile"),
  postImages: createMulterConfig("postImages", 5).array("postImages", 5),
  projectFiles: createMulterConfig("projectFiles", 10).array(
    "projectFiles",
    10
  ),
  documents: createMulterConfig("documents", 5).array("documents", 5),
};

// Upload to Cloudinary helper function
const uploadToCloudinary = async (filePath, folder = "misc") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `unjob/${folder}`,
      resource_type: "auto",
      quality: "auto:good",
      fetch_format: "auto",
    });

    // Delete local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      original_filename: path.basename(filePath),
      bytes: result.bytes,
      format: result.format,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

// Get optimized URL
const getOptimizedUrl = (publicId, options = {}) => {
  const { width = 800, height = 600, quality = "auto:good" } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop: "fill",
    quality,
    fetch_format: "auto",
  });
};

export  {
  cloudinary,
  uploadConfigs,
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedUrl,
};


