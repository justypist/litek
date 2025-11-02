import { type FC, useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Upload, 
  Download, 
  Copy, 
  Trash2, 
  FileText, 
  File as FileIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Share2
} from "lucide-react";
import {
  createShare,
  getShare,
  deleteShare,
  listLocalShares,
  cleanupExpiredShares,
  formatFileSize,
  formatTimeRemaining,
  triggerDownload,
  EXPIRE_OPTIONS,
  type ShareMetadata
} from "@/lib/share";
import { downloadFile, getWebDAVConfig } from "@/lib/webdav";

/**
 * 上传界面组件
 */
const UploadView: FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [expiresIn, setExpiresIn] = useState<string>(String(EXPIRE_OPTIONS.ONE_DAY));
  const [customPassCode, setCustomPassCode] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [shareResult, setShareResult] = useState<{ url: string; passCode: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 处理文件选择
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    
    // 检查文件大小（警告超过 100MB）
    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("Warning: File size exceeds 100MB, upload may be slow or fail");
    }
    
    setFile(selectedFile);
    setUploadMode("file");
  };

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // 处理粘贴
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type: blob.type });
          setFile(file);
          setUploadMode("file");
          toast.success("Image pasted from clipboard");
        }
      }
    }
  };

  // 处理上传
  const handleUpload = async () => {
    let fileToUpload: File | null = null;
    let fileName = "";

    if (uploadMode === "file") {
      if (!file) {
        toast.error("Please select a file");
        return;
      }
      fileToUpload = file;
      fileName = file.name;
    } else {
      if (!textContent.trim()) {
        toast.error("Please enter some text");
        return;
      }
      const blob = new Blob([textContent], { type: "text/plain" });
      fileToUpload = new File([blob], `text-${Date.now()}.txt`, { type: "text/plain" });
      fileName = fileToUpload.name;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await createShare(
        fileToUpload,
        fileName,
        parseInt(expiresIn),
        customPassCode || undefined,
        (progress) => setUploadProgress(progress)
      );

      setShareResult(result);
      toast.success("File uploaded successfully!");
      
      // 重置表单
      setFile(null);
      setTextContent("");
      setCustomPassCode("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // 如果有分享结果，显示结果界面
  if (shareResult) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Share Created Successfully!</h2>
        </div>

        <div className="flex flex-col gap-4 p-6 border rounded-lg bg-muted/50">
          <div className="flex flex-col gap-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input value={shareResult.url} readOnly className="font-mono text-sm" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => copyToClipboard(shareResult.url, "Link")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The link contains the access code. Share this link with others.
            </p>
          </div>
        </div>

        <Button onClick={() => setShareResult(null)} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Upload Another File
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Security Notice</p>
          <p>This is a temporary file sharing service. Please do not upload sensitive or confidential files.</p>
        </div>
      </div>

      {/* 上传模式选择 */}
      <div className="flex gap-2">
        <Button
          variant={uploadMode === "file" ? "default" : "outline"}
          onClick={() => setUploadMode("file")}
          className="flex-1"
        >
          <FileIcon className="h-4 w-4 mr-2" />
          File
        </Button>
        <Button
          variant={uploadMode === "text" ? "default" : "outline"}
          onClick={() => setUploadMode("text")}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Text
        </Button>
      </div>

      {/* 文件上传区域 */}
      {uploadMode === "file" && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileIcon className="h-12 w-12 text-primary" />
              <div className="font-medium">{file.name}</div>
              <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
              <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-lg font-medium">Drop file here or click to select</div>
              <div className="text-sm text-muted-foreground">
                You can also paste images from clipboard
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                Select File
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 文本输入区域 */}
      {uploadMode === "text" && (
        <div className="flex flex-col gap-2">
          <Label>Text Content</Label>
          <Textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter or paste your text here..."
            className="min-h-[200px] resize-none font-mono text-sm"
          />
        </div>
      )}

      {/* 配置选项 */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Expiration Time</Label>
          <Select value={expiresIn} onValueChange={setExpiresIn}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(EXPIRE_OPTIONS.ONE_HOUR)}>1 Hour</SelectItem>
              <SelectItem value={String(EXPIRE_OPTIONS.ONE_DAY)}>1 Day</SelectItem>
              <SelectItem value={String(EXPIRE_OPTIONS.SEVEN_DAYS)}>7 Days</SelectItem>
              <SelectItem value={String(EXPIRE_OPTIONS.THIRTY_DAYS)}>30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Custom Passcode (Optional)</Label>
          <Input
            value={customPassCode}
            onChange={(e) => setCustomPassCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
            placeholder="Leave empty to generate automatically"
            maxLength={12}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Only letters and numbers, 6-12 characters
          </p>
        </div>
      </div>

      {/* 上传按钮 */}
      <Button
        onClick={handleUpload}
        disabled={uploading || (uploadMode === "file" && !file) || (uploadMode === "text" && !textContent.trim())}
        className="w-full"
        size="lg"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading... {uploadProgress.toFixed(0)}%
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 mr-2" />
            Create Share
          </>
        )}
      </Button>
    </div>
  );
};

/**
 * 下载界面组件
 */
const DownloadView: FC<{ shareId: string }> = ({ shareId }) => {
  const [searchParams] = useSearchParams();
  const [passCode, setPassCode] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [textPreview, setTextPreview] = useState<string>("");

  // 文件路径常量
  const filePath = `/${shareId}_file.dat`;

  // 自动从 URL 获取密码并填充（但不自动提交）
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setPassCode(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const handleVerifyPassword = async () => {
    if (!passCode.trim()) {
      toast.error("Please enter the passcode");
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(0);
      setError("");

      // 先验证密码并获取 metadata
      const meta = await getShare(shareId, passCode.toLowerCase());
      setMetadata(meta);
      
      // 如果是文本文件，自动下载并预览
      if (meta.fileType === 'text/plain') {
        const file = await downloadFile(filePath);
        const text = await file.text();
        setTextPreview(text);
        toast.success("Text loaded successfully!");
      } else {
        // 非文本文件只显示详情，不自动下载
        toast.success("Password verified!");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Verification failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadFile = async () => {
    if (!metadata) return;

    try {
      setDownloading(true);
      setDownloadProgress(0);

      const file = await downloadFile(filePath, (progress) => setDownloadProgress(progress));
      
      triggerDownload(file, metadata.fileName);
      toast.success("File downloaded successfully!");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };


  // 显示文本预览
  if (textPreview && metadata) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold">{metadata.fileName}</h2>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(metadata.fileSize)} • Expires {formatTimeRemaining(metadata.expiresAt)}
          </p>
        </div>

        <div className="border rounded-lg p-6 bg-muted/30">
          <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[600px]">
            {textPreview}
          </pre>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Text Preview</span>
        </div>

        <Button 
          onClick={handleDownloadFile} 
          disabled={downloading}
          className="w-full" 
          size="lg"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Downloading... {downloadProgress.toFixed(0)}%
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download
            </>
          )}
        </Button>
      </div>
    );
  }

  // 显示文件详情页（非文本文件，已验证密码）
  if (metadata && !textPreview) {
    return (
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        <div className="text-center">
          <FileIcon className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">{metadata.fileName}</h2>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(metadata.fileSize)} • Expires {formatTimeRemaining(metadata.expiresAt)}
          </p>
        </div>

        <div className="flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Password Verified</p>
            <p>Click the button below to download the file.</p>
          </div>
        </div>

        <Button
          onClick={handleDownloadFile}
          disabled={downloading}
          className="w-full"
          size="lg"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Downloading... {downloadProgress.toFixed(0)}%
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </>
          )}
        </Button>
      </div>
    );
  }

  // 显示密码输入界面
  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto">
      <div className="text-center">
        <Download className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold mb-2">Download Shared File</h2>
        <p className="text-sm text-muted-foreground">
          Enter the passcode to download the file
        </p>
      </div>

      <div className="flex flex-col gap-4 p-6 border rounded-lg">
        <div className="flex flex-col gap-2">
          <Label>Passcode</Label>
          <Input
            value={passCode}
            onChange={(e) => setPassCode(e.target.value.toLowerCase())}
            placeholder="Enter passcode"
            className="font-mono text-lg text-center tracking-wider"
            maxLength={12}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleVerifyPassword();
              }
            }}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <Button
          onClick={handleVerifyPassword}
          disabled={downloading || !passCode.trim()}
          className="w-full"
          size="lg"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify Password
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * 管理界面组件
 */
const ManageView: FC = () => {
  const [shares, setShares] = useState<ShareMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [cleaningUp, setCleaningUp] = useState<boolean>(false);

  const loadShares = async () => {
    setLoading(true);
    try {
      const localShares = await listLocalShares();
      setShares(localShares);
    } catch (error) {
      console.error("Failed to load shares:", error);
      toast.error("Failed to load shares");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shareId: string) => {
    setDeletingIds(prev => new Set(prev).add(shareId));
    try {
      await deleteShare(shareId);
      toast.success("Share deleted");
      loadShares();
    } catch (error) {
      console.error("Failed to delete share:", error);
      toast.error("Failed to delete share");
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(shareId);
        return next;
      });
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const count = await cleanupExpiredShares();
      toast.success(`Cleaned up ${count} expired share(s)`);
      loadShares();
    } catch (error) {
      console.error("Failed to cleanup:", error);
      toast.error("Failed to cleanup expired shares");
    } finally {
      setCleaningUp(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <FileIcon className="h-16 w-16 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">No shares found</p>
        <p className="text-sm text-muted-foreground">
          Upload files to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Shares ({shares.length})</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCleanup}
          disabled={cleaningUp}
        >
          {cleaningUp ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cleaning...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Expired
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-3">
        {shares.map((share) => {
          const isExpired = Date.now() > share.expiresAt;
          const isDeleting = deletingIds.has(share.shareId);
          
          return (
            <div
              key={share.shareId}
              className={`flex items-center gap-4 p-4 border rounded-lg ${
                isExpired ? "opacity-50" : ""
              } ${isDeleting ? "opacity-60" : ""}`}
            >
              <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{share.fileName}</div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{formatFileSize(share.fileSize)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeRemaining(share.expiresAt)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  Code: {share.passCode}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/share/${share.shareId}?code=${encodeURIComponent(share.passCode)}`;
                    copyToClipboard(url, "Link");
                  }}
                  title="Copy link"
                  disabled={isDeleting}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleDelete(share.shareId)}
                  title="Delete"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }
};

/**
 * 主组件
 */
const Tool: FC = () => {
  const { shareId } = useParams<{ shareId?: string }>();
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload");
  const hasConfig = !!getWebDAVConfig();
  const location = window.location.pathname;

  // 如果有 shareId 或者在 /share/:shareId 路由下，显示下载界面
  if (shareId || location.startsWith('/share/')) {
    const id = shareId || location.split('/share/')[1];
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <DownloadView shareId={id} />
      </div>
    );
  }

  // 如果配置缺失，显示不可用提示
  if (!hasConfig) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col gap-6 max-w-md mx-auto items-center justify-center min-h-[400px]">
          <AlertCircle className="h-16 w-16 text-yellow-500" />
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">WebDAV Service Unavailable</h2>
            <p className="text-sm text-muted-foreground">
              The file transfer feature requires WebDAV configuration. Please contact the administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 否则显示上传和管理界面
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        {/* 标签切换 */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "upload"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "manage"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Shares
          </button>
        </div>

        {/* 内容区域 */}
        {activeTab === "upload" ? <UploadView /> : <ManageView />}
      </div>
    </div>
  );
};

export default Tool;

