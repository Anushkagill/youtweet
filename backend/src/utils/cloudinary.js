import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ==========================
// Cloudinary Configuration
// ==========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==========================
// Helper: Remove Local File
// ==========================
const removeLocalFile = async (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error("Failed to remove local file:", err.message);
  }
};

// ==========================
// Upload File (🔥 FIXED)
// ==========================
const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    // 🔥 detect type manually
    const isVideo = localFilePath.match(/\.(mp4|mov|avi|mkv)$/i);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: isVideo ? "video" : "image", // ✅ FIX
      chunk_size: isVideo ? 6000000 : undefined, // ✅ for large videos
    });

    await removeLocalFile(localFilePath);

    return response;
  } catch (error) {
    console.error("Cloudinary Upload Failed:", error.message);
    await removeLocalFile(localFilePath);
    return null;
  }
};

// ==========================
// Extract Public ID from URL
// ==========================
const getPublicIdFromUrl = (url) => {
  if (!url) return null;

  try {
    const parts = url.split("/upload/");
    if (parts.length !== 2) return null;

    const pathWithVersion = parts[1];
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, "");
    const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch {
    return null;
  }
};

// ==========================
// Delete File
// ==========================
const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) return null;

  try {
    const publicId = getPublicIdFromUrl(fileUrl);
    if (!publicId) return null;

    const resourceType = fileUrl.includes("/video/")
      ? "video"
      : fileUrl.includes("/raw/")
      ? "raw"
      : "image";

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    return result;
  } catch (error) {
    console.error("Cloudinary Delete Failed:", error.message);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };