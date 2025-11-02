import { type FC, useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Upload, Download, Loader2, Settings2, X, Image as ImageIcon, StopCircle } from "lucide-react";
import type { ProcessImageMessage, ProcessImageResponse } from "@/workers/image.worker";
import ImageWorker from "@/workers/image.worker?worker";

type ImageFormat = "jpeg" | "png" | "webp" | "avif";

interface ImageState {
  originalFile: File;
  originalUrl: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  processedUrl?: string;
  processedSize?: number;
  processedBlob?: Blob;
  format: ImageFormat;
  quality: number;
  width: number;
  height: number;
  keepAspectRatio: boolean;
  isProcessing: boolean;
}

const Tool: FC = () => {
  const [image, setImage] = useState<ImageState | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [comparePosition, setComparePosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const processingAbortRef = useRef<boolean>(false);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  // 读取图片文件并转换为 ImageData
  const fileToImageData = async (file: File): Promise<{ imageData: ImageData; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve({ imageData, width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  // 处理文件上传
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    try {
      const { width, height } = await fileToImageData(file);
      const originalUrl = URL.createObjectURL(file);

      const newImage: ImageState = {
        originalFile: file,
        originalUrl,
        originalSize: file.size,
        originalWidth: width,
        originalHeight: height,
        format: "webp",
        quality: 75,
        width,
        height,
        keepAspectRatio: true,
        isProcessing: false,
      };

      setImage(newImage);

      // 注意: 不需要在这里手动触发处理,useEffect 会自动处理
    } catch (error) {
      toast.error("Failed to process image");
      console.error(error);
    }
  }, []);

  // 取消当前处理
  const cancelProcessing = useCallback(() => {
    processingAbortRef.current = true;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setImage((prev) => (prev ? { ...prev, isProcessing: false } : null));
  }, []);

  // 当配置改变时自动重新处理
  useEffect(() => {
    if (!image || image.isProcessing) return;

    const processCurrentImage = async () => {
      // 重置取消标志
      processingAbortRef.current = false;
      
      setImage((prev) => (prev ? { ...prev, isProcessing: true } : null));

      try {
        // 获取原始图片的 ImageData
        const { imageData: originalImageData } = await fileToImageData(image.originalFile);

        // 检查是否被取消
        if (processingAbortRef.current) {
          setImage((prev) => (prev ? { ...prev, isProcessing: false } : null));
          return;
        }

        // 创建新的 Worker
        const worker = new ImageWorker();
        workerRef.current = worker;

        // 监听 Worker 消息
        worker.onmessage = (e: MessageEvent<ProcessImageResponse>) => {
          if (processingAbortRef.current) {
            worker.terminate();
            return;
          }

          if (e.data.type === "success" && e.data.data && e.data.mimeType) {
            const blob = new Blob([e.data.data], { type: e.data.mimeType });
            const url = URL.createObjectURL(blob);

            setImage((prev) =>
              prev
                ? {
                    ...prev,
                    processedUrl: url,
                    processedSize: blob.size,
                    processedBlob: blob,
                    isProcessing: false,
                  }
                : null
            );

            worker.terminate();
            workerRef.current = null;
          } else if (e.data.type === "error") {
            toast.error("Failed to process image");
            console.error(e.data.error);
            setImage((prev) => (prev ? { ...prev, isProcessing: false } : null));
            worker.terminate();
            workerRef.current = null;
          }
        };

        worker.onerror = (error) => {
          console.error("Worker error:", error);
          toast.error("Failed to process image");
          setImage((prev) => (prev ? { ...prev, isProcessing: false } : null));
          worker.terminate();
          workerRef.current = null;
        };

        // 发送处理消息到 Worker
        const message: ProcessImageMessage = {
          type: "process",
          imageData: originalImageData,
          format: image.format,
          quality: image.quality,
          width: image.width,
          height: image.height,
          originalWidth: image.originalWidth,
          originalHeight: image.originalHeight,
        };

        worker.postMessage(message);
      } catch (error) {
        toast.error("Failed to process image");
        console.error(error);
        setImage((prev) => (prev ? { ...prev, isProcessing: false } : null));
      }
    };

    if (!image.processedUrl) {
      // 首次上传,立即处理
      processCurrentImage();
      // 返回清理函数，确保即使是首次上传也能正确清理
      return () => {
        cancelProcessing();
      };
    } else {
      // 配置变化,延迟处理
      const timer = setTimeout(() => {
        processCurrentImage();
      }, 500);
      return () => {
        clearTimeout(timer);
        // 清理时取消正在进行的处理
        cancelProcessing();
      };
    }
  }, [image?.format, image?.quality, image?.width, image?.height, cancelProcessing]);

  // 组件卸载时清理 Worker
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // 处理粘贴事件 (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // 遍历剪贴板项目，查找图片
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // 检查是否为图片类型
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // 创建一个 FileList 对象来复用 handleFileUpload
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            await handleFileUpload(dataTransfer.files);
            toast.success("Image pasted successfully");
            break;
          }
        }
      }
    };

    // 添加全局粘贴事件监听
    document.addEventListener("paste", handlePaste);
    
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handleFileUpload]);

  // 监听窗口大小变化,重新计算显示尺寸
  useEffect(() => {
    const handleResize = () => {
      if (originalImageRef.current) {
        setDisplaySize({
          width: originalImageRef.current.clientWidth,
          height: originalImageRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 下载图片
  const downloadImage = () => {
    if (!image?.processedBlob) {
      toast.error("Please process the image first");
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(image.processedBlob);
    const ext = image.format === "jpeg" ? "jpg" : image.format;
    link.download = `${image.originalFile.name.split(".")[0]}_compressed.${ext}`;
    link.click();
  };

  // 更新图片配置
  const updateImage = (updates: Partial<ImageState>) => {
    setImage((prev) => {
      if (!prev) return null;

      const updated = { ...prev, ...updates };

      // 如果保持宽高比且宽或高被修改
      if (updated.keepAspectRatio) {
        const aspectRatio = prev.originalWidth / prev.originalHeight;

        if (updates.width !== undefined && updates.height === undefined) {
          updated.height = Math.round(updated.width / aspectRatio);
        } else if (updates.height !== undefined && updates.width === undefined) {
          updated.width = Math.round(updated.height * aspectRatio);
        }
      }

      return updated;
    });
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 重置图片
  const resetImage = () => {
    if (image) {
      URL.revokeObjectURL(image.originalUrl);
      if (image.processedUrl) {
        URL.revokeObjectURL(image.processedUrl);
      }
    }
    setImage(null);
    setComparePosition(50);
  };

  // 拖拽上传
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 处理对比滑块拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // 防止文本选中
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !compareContainerRef.current) return;
      
      e.preventDefault(); // 防止文本选中

      const rect = compareContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setComparePosition(percentage);
    },
    [isDragging]
  );

  const handleMouseUp = (e: MouseEvent) => {
    e.preventDefault(); // 防止文本选中
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // 如果没有图片,显示上传界面
  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4 py-8">
        <div
          className="w-full max-w-2xl border-2 border-dashed rounded-2xl p-6 sm:p-12 lg:p-16 text-center hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 sm:mb-6" />
          <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-3">Drag and drop image or click to upload</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Supports JPEG, PNG, WebP, AVIF, etc.
            <span className="hidden sm:inline"> • Press <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">Ctrl+V</kbd> to paste</span>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto text-left">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">High quality compression</p>
                <p className="text-xs text-muted-foreground">Keep visual quality while reducing file size</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Settings2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">Format conversion</p>
                <p className="text-xs text-muted-foreground">Supports multiple modern image formats</p>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={resetImage} className="flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{image.originalFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {image.originalWidth} × {image.originalHeight}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          {image.isProcessing && (
            <Button variant="outline" size="sm" onClick={cancelProcessing}>
              <StopCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="flex-1 sm:flex-initial">
            <Settings2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{showSettings ? "Hide" : "Show"} settings</span>
            <span className="sm:hidden">{showSettings ? "Hide" : "Settings"}</span>
          </Button>
          <Button
            size="sm"
            onClick={downloadImage}
            disabled={!image.processedBlob || image.isProcessing}
            className="flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 图片对比区域 */}
        <div className="flex-1 relative min-h-[300px] lg:min-h-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,.03)_10px,rgba(0,0,0,.03)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,.03)_10px,rgba(255,255,255,.03)_20px)]">
          {image.isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            </div>
          ) : null}

          <div
            ref={compareContainerRef}
            className="relative w-full h-full select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
          >
            {/* 原图 */}
            <div className="absolute inset-0">
              <img
                ref={originalImageRef}
                src={image.originalUrl}
                alt="Original image"
                className="w-full h-full object-contain"
                style={{ imageRendering: "crisp-edges" }}
                onLoad={(e) => {
                  // 记录原图的实际显示尺寸
                  const img = e.currentTarget;
                  setDisplaySize({
                    width: img.clientWidth,
                    height: img.clientHeight,
                  });
                }}
              />
            </div>

            {/* 处理后的图片 */}
            {image.processedUrl && displaySize && (
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
              >
                <img
                  src={image.processedUrl}
                  alt="Processed image"
                  className="w-full h-full object-contain"
                  style={{ 
                    imageRendering: "crisp-edges",
                  }}
                />
              </div>
            )}

            {/* 对比滑块 */}
            {image.processedUrl && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-20 select-none"
                style={{ 
                  left: `${comparePosition}%`,
                  userSelect: "none",
                  WebkitUserSelect: "none"
                }}
                onMouseDown={handleMouseDown}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full shadow-lg flex items-center justify-center pointer-events-auto">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                    <div className="w-0.5 h-4 bg-primary-foreground rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {/* 文件大小信息 */}
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="bg-background/90 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-lg border">
                <p className="text-xs text-muted-foreground">Original</p>
                <p className="font-semibold text-sm">{formatFileSize(image.originalSize)}</p>
              </div>
              {image.processedSize !== undefined && (() => {
                const sizeDiff = image.originalSize - image.processedSize;
                const percentDiff = (sizeDiff / image.originalSize) * 100;
                const isSmaller = sizeDiff > 0;
                
                return (
                  <div className="bg-background/90 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-lg border">
                    <p className="text-xs text-muted-foreground">Output</p>
                    <p className={`font-semibold text-sm ${isSmaller ? 'text-green-600' : 'text-orange-600'}`}>
                      {formatFileSize(image.processedSize)}
                      <span className="text-xs ml-1">
                        ({isSmaller ? '' : '+'}{Math.abs(percentDiff).toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 设置面板 - 小屏幕时在底部，大屏幕时在右侧 */}
        {showSettings && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-background overflow-y-auto max-h-[50vh] lg:max-h-none">
            <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
              {/* 格式选择 */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Output format</Label>
                <Select
                  value={image.format}
                  onValueChange={(value) => updateImage({ format: value as ImageFormat })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                    <SelectItem value="avif">AVIF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 质量控制 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Quality</Label>
                  <span className="text-sm font-mono text-muted-foreground">{image.quality}%</span>
                </div>
                <Slider
                  value={[image.quality]}
                  onValueChange={([value]) => updateImage({ quality: value })}
                  min={1}
                  max={100}
                  step={1}
                  disabled={image.format === "png"}
                  className="py-4"
                />
                {image.format === "png" && (
                  <p className="text-xs text-muted-foreground">PNG format is lossless compression</p>
                )}
              </div>

              {/* 尺寸调整 */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Size</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Width (px)</Label>
                    <Input
                      type="number"
                      value={image.width}
                      onChange={(e) => updateImage({ width: Number(e.target.value) })}
                      min={1}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Height (px)</Label>
                    <Input
                      type="number"
                      value={image.height}
                      onChange={(e) => updateImage({ height: Number(e.target.value) })}
                      min={1}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="aspect-ratio"
                    checked={image.keepAspectRatio}
                    onChange={(e) => updateImage({ keepAspectRatio: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <Label htmlFor="aspect-ratio" className="text-sm cursor-pointer">
                    Keep aspect ratio
                  </Label>
                </div>
              </div>

              {/* 统计信息 */}
              {image.processedSize !== undefined && (() => {
                const sizeDiff = image.originalSize - image.processedSize;
                const percentDiff = (sizeDiff / image.originalSize) * 100;
                const isSmaller = sizeDiff > 0;
                
                return (
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-sm font-semibold">Processing result</Label>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original dimensions</span>
                        <span className="font-mono">{image.originalWidth} × {image.originalHeight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output dimensions</span>
                        <span className="font-mono">{image.width} × {image.height}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Original file size</span>
                        <span className="font-mono">{formatFileSize(image.originalSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Output file size</span>
                        <span className={`font-mono ${isSmaller ? 'text-green-600' : 'text-orange-600'}`}>
                          {formatFileSize(image.processedSize)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground font-semibold">
                          {isSmaller ? 'Saved' : 'Increased'}
                        </span>
                        <span className={`font-mono font-semibold ${isSmaller ? 'text-green-600' : 'text-orange-600'}`}>
                          {isSmaller ? '' : '+'}{formatFileSize(Math.abs(sizeDiff))} 
                          <span className="text-xs ml-1">
                            ({isSmaller ? '' : '+'}{Math.abs(percentDiff).toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tool;
