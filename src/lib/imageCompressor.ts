/**
 * MINARA BOS — CLIENT-SIDE IMAGE COMPRESSOR SERVICE
 * 
 * Compresses attendance selfie photos, proof of work images, and broadcast uploads
 * via Canvas API down to optimized resolution (e.g. 800x800) and JPEG quality (~75%),
 * reducing byte size by 80-90% while maintaining watermark clarity.
 */

export interface CompressionResult {
  compressedBase64: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  compressionRatioPercent: number;
  width: number;
  height: number;
}

export class ImageCompressorService {
  /**
   * Compresses an input File or Base64 Image string
   */
  static async compressImage(
    source: File | string,
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75
  ): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let originalSizeBytes = 0;
      if (source instanceof File) {
        originalSizeBytes = source.size;
      } else if (typeof source === 'string') {
        originalSizeBytes = Math.round((source.length * 3) / 4);
      }

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Calculate aspect ratio scale
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const fallbackStr = typeof source === 'string' ? source : '';
            const fallbackKb = Math.round(originalSizeBytes / 1024);
            return resolve({
              compressedBase64: fallbackStr,
              originalSizeKb: fallbackKb,
              compressedSizeKb: fallbackKb,
              compressionRatioPercent: 0,
              width: img.width,
              height: img.height,
            });
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG format with target quality factor
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          const compressedSizeBytes = Math.round((compressedBase64.length * 3) / 4);

          const originalSizeKb = Math.round(originalSizeBytes / 1024);
          const compressedSizeKb = Math.round(compressedSizeBytes / 1024);
          const compressionRatioPercent = originalSizeKb > 0
            ? Math.max(0, Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100))
            : 0;

          resolve({
            compressedBase64,
            originalSizeKb,
            compressedSizeKb,
            compressionRatioPercent,
            width,
            height,
          });
        } catch (err) {
          const fallbackStr = typeof source === 'string' ? source : '';
          const fallbackKb = Math.round(originalSizeBytes / 1024);
          resolve({
            compressedBase64: fallbackStr,
            originalSizeKb: fallbackKb,
            compressedSizeKb: fallbackKb,
            compressionRatioPercent: 0,
            width: img.width || 800,
            height: img.height || 800,
          });
        }
      };

      img.onerror = () => {
        const fallbackStr = typeof source === 'string' ? source : '';
        const fallbackKb = Math.round(originalSizeBytes / 1024);
        resolve({
          compressedBase64: fallbackStr,
          originalSizeKb: fallbackKb,
          compressedSizeKb: fallbackKb,
          compressionRatioPercent: 0,
          width: 800,
          height: 800,
        });
      };

      if (source instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(source);
      } else {
        img.src = source;
      }
    });
  }
}
