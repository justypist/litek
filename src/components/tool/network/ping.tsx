import { useState, useEffect, useRef, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PingResult {
  seq: number;
  time: number;
  success: boolean;
  error?: string;
}

interface PingStats {
  sent: number;
  received: number;
  lost: number;
  min: number;
  max: number;
  avg: number;
}

const Tool: FC = () => {
  const [url, setUrl] = useState<string>("");
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<PingResult[]>([]);
  const [stats, setStats] = useState<PingStats>({
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

  const ping = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    const seq = ++seqRef.current;
    const targetUrl = url.trim();

    const startTime = performance.now();

    try {
      await fetch(targetUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });

      const endTime = performance.now();
      const time = endTime - startTime;

      const newResult: PingResult = {
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
        error instanceof Error ? error.message : "Request failed";

      const newResult: PingResult = {
        seq,
        time,
        success: false,
        error: errorMessage,
      };

      setResults((prev) => [...prev, newResult]);
      updateStats(newResult);
    }
  };

  const updateStats = (newResult: PingResult) => {
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

  const startPing = () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
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

    // Execute first ping immediately
    ping();

    // Then execute every second
    intervalRef.current = window.setInterval(ping, 1000);
  };

  const stopPing = () => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop =
        resultsContainerRef.current.scrollHeight;
    }
  }, [results]);

  useEffect(() => {
    // Cleanup timer
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
          <label className="text-sm font-medium">Target URL or IP</label>
          <Input
            placeholder="e.g. example.com or https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            disabled={running}
          />
        </div>

        <div className="flex gap-2">
          {!running ? (
            <Button onClick={startPing} className="flex-1">
              Start Ping
            </Button>
          ) : (
            <Button onClick={stopPing} variant="destructive" className="flex-1">
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
            <div>{stats.sent} packets</div>
            <div className="text-muted-foreground">Received:</div>
            <div>{stats.received} packets</div>
            <div className="text-muted-foreground">Lost:</div>
            <div>
              {stats.lost} packets ({lossRate}%)
            </div>
            {stats.received > 0 && (
              <>
                <div className="text-muted-foreground">Min Latency:</div>
                <div>{stats.min.toFixed(2)} ms</div>
                <div className="text-muted-foreground">Max Latency:</div>
                <div>{stats.max.toFixed(2)} ms</div>
                <div className="text-muted-foreground">Avg Latency:</div>
                <div>{stats.avg.toFixed(2)} ms</div>
              </>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-2 flex-1 overflow-hidden">
          <div className="text-sm font-medium">Ping Results:</div>
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
                    seq={result.seq} time={result.time.toFixed(2)}ms
                  </>
                ) : (
                  <>
                    seq={result.seq} Request timeout
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

