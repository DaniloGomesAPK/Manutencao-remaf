/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
}

/**
 * Utility to compress and scale images inside the client's browser using HTML5 Canvas.
 * No external large dependencies needed, keeping PWA lightweight.
 */
export const compressImage = (
  fileOrBase64: File | string,
  quality: number = 0.75
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    // Determine quality within user mandated 70-80% threshold for WebP
    const webpQuality = Math.min(Math.max(quality, 0.70), 0.80);
    
    // Calculate initial size
    let originalSizeKB = 0;
    if (fileOrBase64 instanceof File) {
      originalSizeKB = parseFloat((fileOrBase64.size / 1024).toFixed(1));
    } else {
      // Approximate base64 string size in KB
      const stringLength = fileOrBase64.length - (fileOrBase64.indexOf(',') + 1);
      const sizeInBytes = (stringLength * 3) / 4;
      originalSizeKB = parseFloat((sizeInBytes / 1024).toFixed(1));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const maxDim = 1000;

      // Handle aspect-balanced scaling
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      // Create a canvas to draw and compress the pixels
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Unable to create canvas 2D rendering execution context."));
        return;
      }

      // Perform drawing
      ctx.drawImage(img, 0, 0, width, height);

      // Perform compression using webp format and configured quality
      const compressedDataUrl = canvas.toDataURL("image/webp", webpQuality);
      
      // Calculate output size
      const stringLengthOut = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
      const compressedSizeInBytes = (stringLengthOut * 3) / 4;
      const compressedSizeKB = parseFloat((compressedSizeInBytes / 1024).toFixed(1));

      resolve({
        dataUrl: compressedDataUrl,
        originalSizeKB,
        compressedSizeKB,
        width,
        height
      });
    };

    img.onerror = (err) => {
      reject(new Error("Failed to load image files for browser canvas graphics processing: " + err));
    };

    if (fileOrBase64 instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result && typeof e.target.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error("FileReader did not output a valid base64 representation."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrBase64);
    } else {
      img.src = fileOrBase64;
    }
  });
};
