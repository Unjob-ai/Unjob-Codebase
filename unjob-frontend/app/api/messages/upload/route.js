// api/messages/upload/route.js (Enhanced for All File Types)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { uploadToCloudinary } from "@/lib/cloudinary";
import User from "@/models/User";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Better user resolution
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const conversationId = formData.get("conversationId");

    if (!file || !conversationId) {
      return NextResponse.json(
        { error: "File and conversation ID are required" },
        { status: 400 }
      );
    }

    // Check file size (max 50MB for documents, 25MB for media)
    const maxSize =
      file.type.startsWith("image/") || file.type.startsWith("video/")
        ? 25 * 1024 * 1024 // 25MB for media
        : 50 * 1024 * 1024; // 50MB for documents

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeMB}MB.` },
        { status: 400 }
      );
    }

    // Enhanced file type detection and folder organization
    const getFileDetails = (mimeType, fileName) => {
      const extension = fileName.split(".").pop()?.toLowerCase() || "";

      // Images
      if (mimeType.startsWith("image/")) {
        return {
          folder: "unjob/chat/images",
          resourceType: "image",
          category: "image",
        };
      }

      // Videos
      if (mimeType.startsWith("video/")) {
        return {
          folder: "unjob/chat/videos",
          resourceType: "video",
          category: "video",
        };
      }

      // Audio files
      if (mimeType.startsWith("audio/")) {
        return {
          folder: "unjob/chat/audio",
          resourceType: "video", // Cloudinary uses 'video' for audio too
          category: "audio",
        };
      }

      // Documents - PDF
      if (mimeType === "application/pdf" || extension === "pdf") {
        return {
          folder: "unjob/chat/documents/pdf",
          resourceType: "raw",
          category: "document",
        };
      }

      // Documents - Microsoft Office
      if (
        mimeType.includes("application/vnd.openxmlformats-officedocument") ||
        mimeType.includes("application/vnd.ms-") ||
        ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)
      ) {
        return {
          folder: "unjob/chat/documents/office",
          resourceType: "raw",
          category: "document",
        };
      }

      // Text files
      if (
        mimeType.startsWith("text/") ||
        ["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts"].includes(
          extension
        )
      ) {
        return {
          folder: "unjob/chat/documents/text",
          resourceType: "raw",
          category: "document",
        };
      }

      // Archives/Compressed files
      if (
        ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension) ||
        mimeType.includes("zip") ||
        mimeType.includes("compressed")
      ) {
        return {
          folder: "unjob/chat/archives",
          resourceType: "raw",
          category: "archive",
        };
      }

      // Code files
      if (
        [
          "py",
          "java",
          "cpp",
          "c",
          "php",
          "rb",
          "go",
          "rs",
          "swift",
          "kt",
        ].includes(extension)
      ) {
        return {
          folder: "unjob/chat/documents/code",
          resourceType: "raw",
          category: "code",
        };
      }

      // Design files
      if (
        ["psd", "ai", "sketch", "fig", "xd", "svg"].includes(extension) ||
        mimeType.includes("photoshop") ||
        mimeType.includes("illustrator")
      ) {
        return {
          folder: "unjob/chat/design",
          resourceType: "raw",
          category: "design",
        };
      }

      // Default for any other file type
      return {
        folder: "unjob/chat/files/other",
        resourceType: "raw",
        category: "file",
      };
    };

    const { folder, resourceType, category } = getFileDetails(
      file.type,
      file.name
    );

    // Convert file to buffer and upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadToCloudinary(buffer, folder, resourceType);

    // Enhanced file size formatting
    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Get file icon based on category and type
    const getFileIcon = (category, mimeType, fileName) => {
      const extension = fileName.split(".").pop()?.toLowerCase() || "";

      switch (category) {
        case "image":
          return "📷";
        case "video":
          return "🎥";
        case "audio":
          return "🎵";
        case "document":
          if (mimeType === "application/pdf" || extension === "pdf")
            return "📄";
          if (["doc", "docx"].includes(extension)) return "📝";
          if (["xls", "xlsx"].includes(extension)) return "📊";
          if (["ppt", "pptx"].includes(extension)) return "📽️";
          return "📄";
        case "archive":
          return "🗜️";
        case "code":
          return "💻";
        case "design":
          return "🎨";
        default:
          return "📎";
      }
    };

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileType: file.type,
      category,
      icon: getFileIcon(category, file.type, file.name),
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
