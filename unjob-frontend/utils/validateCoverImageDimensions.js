// utils/validateCoverImageDimensions.js
export const validateCoverImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject("Please upload a valid image file.");
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      URL.revokeObjectURL(img.src);

      // Must be ~4:1 aspect ratio (with a small tolerance)
      const ratio = width / height;
      const isFourByOne = Math.abs(ratio - 4) < 0.05;

      if (
        isFourByOne &&
        width >= 1400 && width <= 1600 &&
        height >= 300 && height <= 400
      ) {
        resolve();
      } else {
        reject(
          `Invalid dimensions: ${width}x${height}. Please upload a 4:1 image (1400–1600px wide, 300–400px tall).`
        );
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject("Could not load image to verify dimensions.");
    };
  });
};
