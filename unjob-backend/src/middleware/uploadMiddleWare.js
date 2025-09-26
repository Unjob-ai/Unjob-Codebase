// middleware/upload.js
import multer from "multer";
import path from "path"
import fs from "fs"
import  {cloudinary}  from "../config/cloudinaryConfig.js"
import { AppError } from  "./errorHandler.js"
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Local storage configuration (fallback if Cloudinary fails)
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

    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
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

  // Check file type based on field name
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
    cb(new AppError(`Unsupported file type: ${file.mimetype}`, 400), false);
  }
};

// File size limits (in bytes)
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

// Configure multer with dynamic limits
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
  // Single file uploads
  avatar: createMulterConfig("avatar").single("avatar"),
  profileImage: createMulterConfig("profileImage").single("profileImage"),
  messageFile: createMulterConfig("messageFiles").single("messageFile"),

  // Multiple file uploads
  postImages: createMulterConfig("postImages", 5).array("postImages", 5),
  projectFiles: createMulterConfig("projectFiles", 10).array(
    "projectFiles",
    10
  ),
  documents: createMulterConfig("documents", 5).array("documents", 5),

  // Mixed uploads
  mixed: createMulterConfig("mixed", 10).any(),

  // Field-specific uploads
  fields: (fields) => createMulterConfig("mixed").fields(fields),
};

// File validation middleware
const validateFiles = (allowedTypes = [], maxSize = null) => {
  return asyncHandler(async(req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        throw new apiError(`Invalid file type: ${file.mimetype}`, 400);
      }

      // Check file size
      if (maxSize && file.size > maxSize) {
        throw new apiError(`File too large: ${file.originalname}`, 400);
      }

      // Check for malicious files
      if (file.originalname.includes("..") || file.originalname.includes("/")) {
        throw new apiError("Invalid file name", 400);
      }
    }

    next();
  });
};

// Image processing middleware
const processImages = asyncHandler(async (req, res, next) => {

    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];
    const processedFiles = [];

    for (const file of files) {
      if (file.mimetype.startsWith("image/")) {
        // Here you could add image processing logic
        // For example, resizing, compression, etc.
        processedFiles.push({
          ...file,
          processed: true,
        });
      } else {
        processedFiles.push(file);
      }
    }

    if (req.files) {
      req.files = processedFiles;
    } else {
      req.file = processedFiles[0];
    }
    next();

})

// Clean up uploaded files on error
const cleanupFiles = (files) => {
  if (!files) return;

  const fileList = Array.isArray(files) ? files : [files];

  fileList.forEach((file) => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};

// Error handling middleware for file uploads
const handleUploadError = asyncHandler(async(err, req, res, next) => {
  // Clean up any uploaded files if there's an error
  if (req.files || req.file) {
    cleanupFiles(req.files || req.file);
  }

  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        throw new apiError("File too large", 400)
      case "LIMIT_FILE_COUNT":
        throw new apiError("Too many files uploaded", 400)
      case "LIMIT_UNEXPECTED_FILE":
        throw new apiError("Unexpected file field", 400)
      case "LIMIT_PART_COUNT":
       throw new apiError("Too many parts in upload", 400)
      default:
        throw new apiError("File upload error", 400)
    }
  }
})

// Generate file URL helper
const generateFileUrl = (file, req) => {
  if (file.cloudinary) {
    return file.cloudinary.secure_url;
  }

  const baseUrl =
    process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/${file.path.replace(/\\/g, "/")}`;
};

// File metadata extractor
const extractFileMetadata = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    uploadedAt: new Date(),
  };
};

// Upload to cloud storage helper
const uploadToCloud = asyncHandler(async (file, folder = "misc") => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `unjob/${folder}`,
      resource_type: "auto",
      quality: "auto:good",
      fetch_format: "auto",
    });

    // Delete local file after successful cloud upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      original_filename: file.originalname,
      bytes: result.bytes,
      format: result.format,
    };
  } catch (error) {
    throw new apiError("Cloud upload failed", 500);
  }
})

// Middleware to upload files to cloud after local upload
const uploadToCloudMiddleware = (folder = "misc") => {
  return asyncHandler(async (req, res, next) => {
    try {
      if (!req.files && !req.file) {
        return next();
      }

      const files = req.files || [req.file];
      const cloudFiles = [];

      for (const file of files) {
        const cloudFile = await uploadToCloud(file, folder);
        cloudFiles.push(cloudFile);
      }

      if (req.files) {
        req.cloudFiles = cloudFiles;
      } else {
        req.cloudFile = cloudFiles[0];
      }
      next();
    } catch (error) {
throw new apiError("Cloud upload error", 500) }
  })
}

export {
  uploadConfigs,
  validateFiles,
  processImages,
  handleUploadError,
  generateFileUrl,
  extractFileMetadata,
  uploadToCloud,
  uploadToCloudMiddleware,
  cleanupFiles,
  ensureDirectoryExists,
  createMulterConfig,
};



