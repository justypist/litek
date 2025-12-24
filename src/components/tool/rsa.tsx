import { useState, useEffect, type FC } from "react";
import { Copy, KeyRound, Loader2, Download, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 密钥长度
type KeySize = 2048 | 3072 | 4096;

// 按钮状态类型
type ButtonStatus = "idle" | "loading" | "success" | "error";

// 密钥长度选项
const keySizes: { value: KeySize; label: string }[] = [
  { value: 2048, label: "2048 bits" },
  { value: 3072, label: "3072 bits" },
  { value: 4096, label: "4096 bits" },
];

// ArrayBuffer 转 Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// 格式化为 PEM 格式 (OpenSSH 兼容的私钥格式)
const formatPEM = (base64: string, type: string): string => {
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----`;
};

// 从 SPKI 格式提取 RSA 公钥参数并转换为 SSH 格式
const spkiToSSHPublicKey = async (publicKey: CryptoKey): Promise<{ n: Uint8Array; e: Uint8Array }> => {
  // 导出为 JWK 格式以获取 n 和 e
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  
  if (!jwk.n || !jwk.e) {
    throw new Error("Failed to extract RSA parameters");
  }
  
  // Base64URL 解码
  const base64UrlDecode = (str: string): Uint8Array => {
    // 将 Base64URL 转换为标准 Base64
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padding);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };
  
  return {
    n: base64UrlDecode(jwk.n),
    e: base64UrlDecode(jwk.e),
  };
};

// 将数字转换为 SSH 格式的字节（大端序，带长度前缀）
const encodeSSHString = (data: Uint8Array): Uint8Array => {
  // 如果最高位是 1，需要在前面加 0x00（表示正数）
  const needsPadding = data[0] & 0x80;
  const length = data.length + (needsPadding ? 1 : 0);
  
  const result = new Uint8Array(4 + length);
  // 写入长度（大端序 4 字节）
  result[0] = (length >> 24) & 0xff;
  result[1] = (length >> 16) & 0xff;
  result[2] = (length >> 8) & 0xff;
  result[3] = length & 0xff;
  
  if (needsPadding) {
    result[4] = 0x00;
    result.set(data, 5);
  } else {
    result.set(data, 4);
  }
  
  return result;
};

// 生成 SSH 格式的公钥字符串
const generateSSHPublicKey = async (publicKey: CryptoKey, comment: string): Promise<string> => {
  const { n, e } = await spkiToSSHPublicKey(publicKey);
  
  // SSH 公钥格式: ssh-rsa <base64 data> <comment>
  // base64 data 包含: 长度+类型字符串, 长度+e, 长度+n
  const keyType = new TextEncoder().encode("ssh-rsa");
  const keyTypeEncoded = encodeSSHString(keyType);
  const eEncoded = encodeSSHString(e);
  const nEncoded = encodeSSHString(n);
  
  // 合并所有部分
  const totalLength = keyTypeEncoded.length + eEncoded.length + nEncoded.length;
  const keyData = new Uint8Array(totalLength);
  let offset = 0;
  keyData.set(keyTypeEncoded, offset);
  offset += keyTypeEncoded.length;
  keyData.set(eEncoded, offset);
  offset += eEncoded.length;
  keyData.set(nEncoded, offset);
  
  // 转换为 Base64
  let binary = "";
  for (let i = 0; i < keyData.length; i++) {
    binary += String.fromCharCode(keyData[i]);
  }
  const base64Data = btoa(binary);
  
  return `ssh-rsa ${base64Data}${comment ? ` ${comment}` : ""}`;
};

// 状态按钮 Hook
const useButtonStatus = (resetDelay = 1500): [ButtonStatus, (status: ButtonStatus) => void] => {
  const [status, setStatus] = useState<ButtonStatus>("idle");

  useEffect(() => {
    if (status === "success" || status === "error") {
      const timer = setTimeout(() => setStatus("idle"), resetDelay);
      return () => clearTimeout(timer);
    }
  }, [status, resetDelay]);

  return [status, setStatus];
};

// 密钥显示组件
interface KeyDisplayProps {
  label: string;
  filename: string;
  value: string;
}

const KeyDisplay: FC<KeyDisplayProps> = ({ label, filename, value }) => {
  const [copyStatus, setCopyStatus] = useButtonStatus();
  const [downloadStatus, setDownloadStatus] = useButtonStatus();

  const copyToClipboard = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("success");
    } catch {
      setCopyStatus("error");
    }
  };

  const downloadKey = () => {
    if (!value) return;
    try {
      const blob = new Blob([value], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadStatus("success");
    } catch {
      setDownloadStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-medium">{label}</label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={downloadStatus === "success" ? "default" : downloadStatus === "error" ? "destructive" : "outline"}
            onClick={downloadKey}
            disabled={!value}
            className="min-w-[100px] transition-all"
          >
            {downloadStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Done
              </>
            ) : downloadStatus === "error" ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Failed
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1" />
                {filename}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant={copyStatus === "success" ? "default" : copyStatus === "error" ? "destructive" : "outline"}
            onClick={copyToClipboard}
            disabled={!value}
            className="min-w-[80px] transition-all"
          >
            {copyStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : copyStatus === "error" ? (
              <>
                <X className="h-4 w-4 mr-1" />
                Failed
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
      <Textarea
        className="font-mono text-xs resize-none h-40"
        value={value}
        readOnly
        placeholder={`${label} will be displayed here`}
      />
    </div>
  );
};

const Tool: FC = () => {
  const [keySize, setKeySize] = useState<KeySize>(4096);
  const [comment, setComment] = useState<string>("user@localhost");
  const [publicKey, setPublicKey] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [generateStatus, setGenerateStatus] = useButtonStatus(2000);

  // 生成密钥对
  const generateKeyPair = async () => {
    setGenerateStatus("loading");
    setPublicKey("");
    setPrivateKey("");

    try {
      // 使用 Web Crypto API 生成 RSA 密钥对
      // 使用 RSASSA-PKCS1-v1_5 因为 SSH 使用这种签名算法
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: keySize,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: "SHA-256",
        },
        true, // extractable
        ["sign", "verify"]
      );

      // 生成 SSH 格式的公钥 (id_rsa.pub)
      const sshPublicKey = await generateSSHPublicKey(keyPair.publicKey, comment);

      // 导出私钥为 PKCS8 格式，然后转换为 PEM
      // 注意：这是标准的 PKCS#8 格式，OpenSSH 8.0+ 可以直接使用
      const privateKeyDer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const privateKeyBase64 = arrayBufferToBase64(privateKeyDer);
      const privateKeyPem = formatPEM(privateKeyBase64, "PRIVATE KEY");

      setPublicKey(sshPublicKey);
      setPrivateKey(privateKeyPem);
      setGenerateStatus("success");
    } catch {
      setGenerateStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-muted-foreground">
        Generate SSH RSA key pairs (like ssh-keygen). Keys are generated entirely in your browser.
      </span>

      {/* 配置选项 */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* 密钥长度选择 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Key Size</label>
          <Select
            value={String(keySize)}
            onValueChange={(v) => setKeySize(Number(v) as KeySize)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {keySizes.map((size) => (
                <SelectItem key={size.value} value={String(size.value)}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 注释/标识 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Comment</label>
          <Input
            className="w-[200px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="user@hostname"
          />
        </div>

        {/* 生成按钮 */}
        <Button 
          onClick={generateKeyPair} 
          disabled={generateStatus === "loading"}
          variant={generateStatus === "success" ? "default" : generateStatus === "error" ? "destructive" : "default"}
          className="min-w-[120px] transition-all"
        >
          {generateStatus === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : generateStatus === "success" ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Generated!
            </>
          ) : generateStatus === "error" ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Failed
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* 密钥显示 */}
      <div className="grid gap-4 md:grid-cols-2">
        <KeyDisplay 
          label="Public Key" 
          filename="id_rsa.pub" 
          value={publicKey} 
        />
        <KeyDisplay 
          label="Private Key" 
          filename="id_rsa" 
          value={privateKey} 
        />
      </div>

      {/* 使用提示 */}
      {publicKey && (
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">Usage:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Download or copy <code className="bg-background px-1 rounded">id_rsa</code> as your private key</li>
            <li>Download or copy <code className="bg-background px-1 rounded">id_rsa.pub</code> as your public key</li>
            <li>Add public key to <code className="bg-background px-1 rounded">~/.ssh/authorized_keys</code> on remote server</li>
            <li>Set private key permissions: <code className="bg-background px-1 rounded">chmod 600 id_rsa</code></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Tool;
