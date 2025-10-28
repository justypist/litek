import { useState, useEffect, useRef, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TCPingResult {
  seq: number;
  time: number;
  success: boolean;
  error?: string;
}

interface TCPingStats {
  sent: number;
  received: number;
  lost: number;
  min: number;
  max: number;
  avg: number;
}

const Tool: FC = () => {
  const [host, setHost] = useState<string>("");
  const [port, setPort] = useState<string>("443");
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<TCPingResult[]>([]);
  const [stats, setStats] = useState<TCPingStats>({
    sent: 0,
    received: 0,
    lost: 0,
    min: 0,
    max: 0,
    avg: 0,
  });
  const intervalRef = useRef<number | null>(null);
  const seqRef = useRef<number>(0);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  const tcping = async () => {
    if (!host.trim()) {
      toast.error("Please enter a hostname or IP");
      return;
    }

    const seq = ++seqRef.current;
    const portNum = parseInt(port) || 443;
    let targetUrl = host.trim();

    // 移除协议前缀
    targetUrl = targetUrl.replace(/^https?:\/\//, "");

    // 构建测试 URL
    const protocol = portNum === 443 ? "https" : "http";
    const url = `${protocol}://${targetUrl}:${portNum}`;

    const startTime = performance.now();

    try {
      // 使用 fetch 测试连接
      await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });

      const endTime = performance.now();
      const time = endTime - startTime;

      const newResult: TCPingResult = {
        seq,
        time,
        success: true,
      };

      setResults((prev) => [...prev, newResult]);
      updateStats(newResult);
    } catch (error: unknown) {
      const endTime = performance.now();
      const time = endTime - startTime;

      const errorMessage =
        error instanceof Error ? error.message : "Connection failed";

      const newResult: TCPingResult = {
        seq,
        time,
        success: false,
        error: errorMessage,
      };

      setResults((prev) => [...prev, newResult]);
      updateStats(newResult);
    }
  };

  const updateStats = (newResult: TCPingResult) => {
    setStats((prev) => {
      const sent = prev.sent + 1;
      const received = newResult.success ? prev.received + 1 : prev.received;
      const lost = sent - received;

      let min = prev.min;
      let max = prev.max;
      let avg = prev.avg;

      if (newResult.success) {
        if (received === 1) {
          min = newResult.time;
          max = newResult.time;
          avg = newResult.time;
        } else {
          min = Math.min(min, newResult.time);
          max = Math.max(max, newResult.time);
          avg = (prev.avg * (received - 1) + newResult.time) / received;
        }
      }

      return { sent, received, lost, min, max, avg };
    });
  };

  const startTCPing = () => {
    if (!host.trim()) {
      toast.error("Please enter a hostname or IP");
      return;
    }

    setRunning(true);
    setResults([]);
    setStats({
      sent: 0,
      received: 0,
      lost: 0,
      min: 0,
      max: 0,
      avg: 0,
    });
    seqRef.current = 0;

    // 立即执行第一次 tcping
    tcping();

    // 然后每秒执行一次
    intervalRef.current = window.setInterval(tcping, 1000);
  };

  const stopTCPing = () => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // 自动滚动到底部
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop =
        resultsContainerRef.current.scrollHeight;
    }
  }, [results]);

  useEffect(() => {
    // 清理定时器
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const lossRate =
    stats.sent > 0 ? ((stats.lost / stats.sent) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Hostname or IP</label>
          <Input
            placeholder="e.g. example.com or 192.168.1.1"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            disabled={running}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Port</label>
          <Input
            type="number"
            placeholder="e.g. 443"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            disabled={running}
            min="1"
            max="65535"
          />
        </div>

        <div className="flex gap-2">
          {!running ? (
            <Button onClick={startTCPing} className="flex-1">
              Start Test
            </Button>
          ) : (
            <Button
              onClick={stopTCPing}
              variant="destructive"
              className="flex-1"
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {stats.sent > 0 && (
        <div className="border rounded-md p-3 bg-card text-card-foreground">
          <div className="text-sm font-medium mb-2">Statistics</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Sent:</div>
            <div>{stats.sent} times</div>
            <div className="text-muted-foreground">Success:</div>
            <div>{stats.received} times</div>
            <div className="text-muted-foreground">Failed:</div>
            <div>
              {stats.lost} times ({lossRate}%)
            </div>
            {stats.received > 0 && (
              <>
                <div className="text-muted-foreground">Min Latency:</div>
                <div>{stats.min.toFixed(2)} ms</div>
                <div className="text-muted-foreground">Max Latency:</div>
                <div>{stats.max.toFixed(2)} ms</div>
                <div className="text-muted-foreground">Avg Latency:</div>
                <div>{stats.avg.toFixed(2)} ms</div>
                <div className="text-muted-foreground">Port Status:</div>
                <div className="text-green-500 font-medium">Open</div>
              </>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="text-sm font-medium">TCPing Results:</div>
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-auto space-y-1 font-mono text-sm border rounded-md p-3 bg-card"
          >
            {results.map((result) => (
              <div
                key={result.seq}
                className={result.success ? "text-green-500" : "text-red-500"}
              >
                {result.success ? (
                  <>
                    seq={result.seq} port={port} time={result.time.toFixed(2)}ms
                  </>
                ) : (
                  <>
                    seq={result.seq} port={port} Connection failed
                    {result.error && ` (${result.error})`}
                  </>
                )}
              </div>
            ))}
            {running && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Running...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tool;

