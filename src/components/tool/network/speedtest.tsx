import { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PerformanceMetrics {
  dns: number;
  tcp: number;
  ssl: number;
  ttfb: number;
  download: number;
  total: number;
}

interface SpeedTestResult {
  downloadSpeed?: number;
  uploadSpeed?: number;
  performance?: PerformanceMetrics;
}

const Tool: FC = () => {
  const [url, setUrl] = useState<string>("");
  const [testType, setTestType] = useState<"performance" | "download" | "upload">(
    "performance"
  );
  const [testing, setTesting] = useState<boolean>(false);
  const [result, setResult] = useState<SpeedTestResult | null>(null);

  const testPerformance = async (targetUrl: string) => {
    // 清除之前的性能数据
    performance.clearResourceTimings();

    const startTime = performance.now();

    try {
      const response = await fetch(targetUrl, {
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 等待内容加载完成
      await response.blob();

      const endTime = performance.now();

      // 获取性能数据
      const perfEntries = performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];
      const entry = perfEntries.find((e) => e.name === targetUrl);

      if (entry) {
        const metrics: PerformanceMetrics = {
          dns: entry.domainLookupEnd - entry.domainLookupStart,
          tcp: entry.connectEnd - entry.connectStart,
          ssl:
            entry.secureConnectionStart > 0
              ? entry.connectEnd - entry.secureConnectionStart
              : 0,
          ttfb: entry.responseStart - entry.requestStart,
          download: entry.responseEnd - entry.responseStart,
          total: entry.responseEnd - entry.startTime,
        };

        return { performance: metrics };
      } else {
        // If no detailed performance data, only return total time
        return {
          performance: {
            dns: 0,
            tcp: 0,
            ssl: 0,
            ttfb: 0,
            download: 0,
            total: endTime - startTime,
          },
        };
      }
    } catch (error) {
      throw error;
    }
  };

  const testDownloadSpeed = async (targetUrl: string) => {
    const startTime = performance.now();

    try {
      const response = await fetch(targetUrl, {
        cache: "no-cache",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const endTime = performance.now();

      const fileSizeBytes = blob.size;
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (fileSizeBytes * 8) / (durationSeconds * 1000000);

      return { downloadSpeed: speedMbps };
    } catch (error) {
      throw error;
    }
  };

  const testUploadSpeed = async (targetUrl: string) => {
    // 生成 1MB 的测试数据
    const testData = new Uint8Array(1024 * 1024);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = Math.floor(Math.random() * 256);
    }

    const startTime = performance.now();

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        body: testData,
        cache: "no-cache",
      });

      const endTime = performance.now();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const fileSizeBytes = testData.length;
      const durationSeconds = (endTime - startTime) / 1000;
      const speedMbps = (fileSizeBytes * 8) / (durationSeconds * 1000000);

      return { uploadSpeed: speedMbps };
    } catch (error) {
      throw error;
    }
  };

  const handleUrlBlur = () => {
    if (!url.trim()) return;
    
    let input = url.trim();
    
    try {
      // Try to parse as URL
      const parsedUrl = new URL(input.startsWith('http') ? input : `https://${input}`);
      const normalizedUrl = parsedUrl.toString();
      
      if (normalizedUrl !== input) {
        setUrl(normalizedUrl);
      }
    } catch {
      // If parsing fails, add https:// prefix
      if (!input.startsWith("http://") && !input.startsWith("https://")) {
        setUrl(`https://${input}`);
      }
    }
  };

  const startTest = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    const targetUrl = url.trim();

    setTesting(true);
    setResult(null);

    try {
      let testResult: SpeedTestResult = {};

      switch (testType) {
        case "performance":
          testResult = await testPerformance(targetUrl);
          toast.success("Performance test completed");
          break;
        case "download":
          testResult = await testDownloadSpeed(targetUrl);
          toast.success("Download speed test completed");
          break;
        case "upload":
          testResult = await testUploadSpeed(targetUrl);
          toast.success("Upload speed test completed");
          break;
      }

      setResult(testResult);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Test failed: ${error.message}`);
      } else {
        toast.error("Test failed");
      }
    } finally {
      setTesting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !testing) {
      startTest();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="border rounded-md p-3 bg-yellow-500/10 border-yellow-500/50">
        <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
          ⚠️ CORS Restrictions
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Due to browser CORS security policies, some websites cannot be tested directly.</p>
          <p>Recommended websites to test:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Public APIs with CORS support</li>
            <li>Your own websites (with configured CORS headers)</li>
            <li>Using CORS proxy services</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Target URL</label>
          <Input
            placeholder="e.g. https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            onKeyPress={handleKeyPress}
            disabled={testing}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Test Type</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={testType}
            onChange={(e) =>
              setTestType(e.target.value as "performance" | "download" | "upload")
            }
            disabled={testing}
          >
            <option value="performance">Page Load Performance</option>
            <option value="download">Download Speed</option>
            <option value="upload">Upload Speed</option>
          </select>
        </div>

        <Button onClick={startTest} disabled={testing} className="w-full">
          {testing && <Loader2 className="mr-2 size-4 animate-spin" />}
          {testing ? "Testing..." : "Start Test"}
        </Button>
      </div>

      {result && (
        <div className="flex flex-col gap-3 flex-1 overflow-auto">
          <div className="text-sm font-medium">Test Results:</div>

          {result.performance && (
            <div className="border rounded-md p-3 bg-card text-card-foreground">
              <div className="text-sm font-medium mb-3">Page Load Performance</div>
              <div className="space-y-2">
                {result.performance.dns > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">DNS Lookup:</div>
                    <div>{result.performance.dns.toFixed(2)} ms</div>
                  </div>
                )}
                {result.performance.tcp > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">TCP Connection:</div>
                    <div>{result.performance.tcp.toFixed(2)} ms</div>
                  </div>
                )}
                {result.performance.ssl > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">SSL Handshake:</div>
                    <div>{result.performance.ssl.toFixed(2)} ms</div>
                  </div>
                )}
                {result.performance.ttfb > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Time to First Byte (TTFB):</div>
                    <div>{result.performance.ttfb.toFixed(2)} ms</div>
                  </div>
                )}
                {result.performance.download > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Content Download:</div>
                    <div>{result.performance.download.toFixed(2)} ms</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2 mt-2">
                  <div className="text-muted-foreground font-medium">Total Time:</div>
                  <div className="font-medium">
                    {result.performance.total.toFixed(2)} ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {result.downloadSpeed !== undefined && (
            <div className="border rounded-md p-3 bg-card text-card-foreground">
              <div className="text-sm font-medium mb-3">Download Speed</div>
              <div className="text-2xl font-bold text-green-500">
                {result.downloadSpeed.toFixed(2)} Mbps
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {(result.downloadSpeed / 8).toFixed(2)} MB/s
              </div>
            </div>
          )}

          {result.uploadSpeed !== undefined && (
            <div className="border rounded-md p-3 bg-card text-card-foreground">
              <div className="text-sm font-medium mb-3">Upload Speed</div>
              <div className="text-2xl font-bold text-blue-500">
                {result.uploadSpeed.toFixed(2)} Mbps
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {(result.uploadSpeed / 8).toFixed(2)} MB/s
              </div>
            </div>
          )}
        </div>
      )}

      {testType === "download" && (
        <div className="text-xs text-muted-foreground">
          Note: Download speed test will download content from the target URL and calculate speed
        </div>
      )}

      {testType === "upload" && (
        <div className="text-xs text-muted-foreground">
          Note: Upload speed test will send 1MB of test data to the target URL
        </div>
      )}
    </div>
  );
};

export default Tool;

