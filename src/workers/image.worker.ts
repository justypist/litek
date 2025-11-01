import { encode as encodeJpeg } from "@jsquash/jpeg";
import { encode as encodePng } from "@jsquash/png";
import { encode as encodeWebp } from "@jsquash/webp";
import { encode as encodeAvif } from "@jsquash/avif";
import resize from "@jsquash/resize";

export interface ProcessImageMessage {
  type: "process";
  imageData: ImageData;
  format: "jpeg" | "png" | "webp" | "avif";
  quality: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ProcessImageResponse {
  type: "success" | "error";
  data?: ArrayBuffer;
  mimeType?: string;
  error?: string;
}

self.onmessage = async (e: MessageEvent<ProcessImageMessage>) => {
  const { imageData, format, quality, width, height, originalWidth, originalHeight } = e.data;

  try {
    let processedImageData = imageData;

    // 如果需要缩放
    if (width !== originalWidth || height !== originalHeight) {
      processedImageData = await resize(imageData, { width, height });
    }

    // 根据格式编码
    let encoded: ArrayBuffer;
    let mimeType: string;

    switch (format) {
      case "jpeg":
        encoded = await encodeJpeg(processedImageData, { quality });
        mimeType = "image/jpeg";
        break;
      case "png":
        encoded = await encodePng(processedImageData);
        mimeType = "image/png";
        break;
      case "webp":
        encoded = await encodeWebp(processedImageData, { quality });
        mimeType = "image/webp";
        break;
      case "avif":
        encoded = await encodeAvif(processedImageData, { quality });
        mimeType = "image/avif";
        break;
      default:
        throw new Error("Unsupported format");
    }

    self.postMessage(
      {
        type: "success",
        data: encoded,
        mimeType,
      } as ProcessImageResponse,
      { transfer: [encoded] }
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    } as ProcessImageResponse);
  }
};

