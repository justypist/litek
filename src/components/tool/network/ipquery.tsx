import { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IPInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  loc?: string;
  org?: string;
  timezone?: string;
  isp?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
  query?: string;
}

const Tool: FC = () => {
  const [ip, setIp] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [ipInfo, setIpInfo] = useState<IPInfo | null>(null);
  const [queryTime, setQueryTime] = useState<number>(0);

  const isValidIP = (ip: string): boolean => {
    // IPv4 正则
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 正则 (简化版)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }
    
    return ipv6Regex.test(ip);
  };

  const queryCurrentIP = async () => {
    setLoading(true);
    setIpInfo(null);
    setQueryTime(0);

    const startTime = performance.now();

    try {
      // 使用 ipinfo.io 查询当前IP (免费，无需密钥)
      const response = await fetch("https://ipinfo.io/json");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      
      setQueryTime(endTime - startTime);
      setIpInfo(data);
      setIp(data.ip);
      toast.success("Successfully queried current IP");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Query failed: ${error.message}`);
      } else {
        toast.error("Query failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const queryIP = async () => {
    if (!ip.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    if (!isValidIP(ip.trim())) {
      toast.error("Invalid IP address format");
      return;
    }

    setLoading(true);
    setIpInfo(null);
    setQueryTime(0);

    const startTime = performance.now();

    try {
      // 使用 ip-api.com (免费，功能较全)
      const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip.trim())}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org,as,proxy,hosting,query`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const endTime = performance.now();
      
      setQueryTime(endTime - startTime);

      if (data.status === "fail") {
        toast.error(data.message || "Query failed");
        return;
      }

      // 转换为统一格式
      const ipData: IPInfo = {
        ip: data.query,
        city: data.city,
        region: data.region,
        country: data.country,
        countryCode: data.countryCode,
        loc: data.lat && data.lon ? `${data.lat},${data.lon}` : undefined,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
        proxy: data.proxy,
        hosting: data.hosting,
      };

      setIpInfo(ipData);
      toast.success("Query successful");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Query failed: ${error.message}`);
      } else {
        toast.error("Query failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      queryIP();
    }
  };

  const getRiskLevel = () => {
    if (!ipInfo) return null;
    
    if (ipInfo.proxy || ipInfo.hosting) {
      return {
        level: "High",
        color: "text-red-500",
        reasons: [
          ipInfo.proxy && "Proxy/VPN detected",
          ipInfo.hosting && "Hosting/Datacenter IP",
        ].filter(Boolean),
      };
    }
    
    return {
      level: "Low",
      color: "text-green-500",
      reasons: ["Regular residential IP"],
    };
  };

  const riskInfo = getRiskLevel();

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">IP Address</label>
          <Input
            placeholder="e.g. 8.8.8.8 or leave empty for current IP"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">
            Supports IPv4 and IPv6 addresses
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={queryIP} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {loading ? "Querying..." : "Query IP"}
          </Button>
          <Button 
            onClick={queryCurrentIP} 
            disabled={loading} 
            variant="outline"
            className="flex-1"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Query My IP
          </Button>
        </div>
      </div>

      {queryTime > 0 && (
        <div className="text-sm text-muted-foreground">
          Query time: {queryTime.toFixed(2)} ms
        </div>
      )}

      {ipInfo && (
        <div className="flex flex-col gap-3 flex-1 overflow-auto">
          <div className="text-sm font-medium">IP Information:</div>
          
          {/* 基本信息 */}
          <div className="border rounded-md p-4 bg-card text-card-foreground">
            <div className="text-sm font-medium mb-3">Basic Information</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">IP Address:</div>
              <div className="font-mono">{ipInfo.ip || ipInfo.query}</div>
              
              {ipInfo.country && (
                <>
                  <div className="text-muted-foreground">Country:</div>
                  <div>{ipInfo.country} ({ipInfo.countryCode})</div>
                </>
              )}
              
              {ipInfo.region && (
                <>
                  <div className="text-muted-foreground">Region:</div>
                  <div>{ipInfo.region}</div>
                </>
              )}
              
              {ipInfo.city && (
                <>
                  <div className="text-muted-foreground">City:</div>
                  <div>{ipInfo.city}</div>
                </>
              )}
              
              {ipInfo.loc && (
                <>
                  <div className="text-muted-foreground">Coordinates:</div>
                  <div className="font-mono">{ipInfo.loc}</div>
                </>
              )}
              
              {ipInfo.timezone && (
                <>
                  <div className="text-muted-foreground">Timezone:</div>
                  <div>{ipInfo.timezone}</div>
                </>
              )}
            </div>
          </div>

          {/* 网络信息 */}
          {(ipInfo.isp || ipInfo.org || ipInfo.as) && (
            <div className="border rounded-md p-4 bg-card text-card-foreground">
              <div className="text-sm font-medium mb-3">Network Information</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {ipInfo.isp && (
                  <>
                    <div className="text-muted-foreground">ISP:</div>
                    <div>{ipInfo.isp}</div>
                  </>
                )}
                
                {ipInfo.org && (
                  <>
                    <div className="text-muted-foreground">Organization:</div>
                    <div>{ipInfo.org}</div>
                  </>
                )}
                
                {ipInfo.as && (
                  <>
                    <div className="text-muted-foreground">AS Number:</div>
                    <div className="font-mono">{ipInfo.as}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 风险评估 */}
          {riskInfo && (
            <div className="border rounded-md p-4 bg-card text-card-foreground">
              <div className="text-sm font-medium mb-3">Risk Assessment</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Risk Level:</div>
                <div className={`font-medium ${riskInfo.color}`}>
                  {riskInfo.level}
                </div>
                
                <div className="text-muted-foreground">Details:</div>
                <div className="space-y-1">
                  {riskInfo.reasons.map((reason, idx) => (
                    <div key={idx} className="text-sm">{reason}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tool;

