import { useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DNSRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSResponse {
  Status: number;
  Answer?: DNSRecord[];
  Question?: Array<{ name: string; type: number }>;
}

const DNS_RECORD_TYPES = [
  { value: "1", label: "A", description: "IPv4 Address" },
  { value: "28", label: "AAAA", description: "IPv6 Address" },
  { value: "5", label: "CNAME", description: "Canonical Name" },
  { value: "15", label: "MX", description: "Mail Exchange" },
  { value: "2", label: "NS", description: "Name Server" },
  { value: "16", label: "TXT", description: "Text Record" },
  { value: "6", label: "SOA", description: "Start of Authority" },
  { value: "257", label: "CAA", description: "Certification Authority Authorization" },
  { value: "12", label: "PTR", description: "Pointer Record" },
  { value: "33", label: "SRV", description: "Service Record" },
];

const getRecordTypeName = (type: number): string => {
  const record = DNS_RECORD_TYPES.find((r) => r.value === String(type));
  return record ? record.label : `TYPE${type}`;
};

const Tool: FC = () => {
  const [domain, setDomain] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<DNSRecord[]>([]);
  const [queryTime, setQueryTime] = useState<number>(0);

  const handleDomainBlur = () => {
    if (!domain.trim()) return;
    
    let input = domain.trim();
    let cleanDomain = input;
    
    try {
      // Try to parse as URL
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      cleanDomain = url.hostname;
    } catch {
      // If parsing fails, fallback to manual cleanup
      cleanDomain = input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
    }
    
    if (cleanDomain !== input) {
      setDomain(cleanDomain);
    }
  };

  const queryDNS = async () => {
    if (!domain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    setLoading(true);
    setResults([]);
    setQueryTime(0);

    const startTime = performance.now();

    try {
      // Query all record types concurrently
      const queries = DNS_RECORD_TYPES.map((recordType) =>
        fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
            domain.trim()
          )}&type=${recordType.value}`,
          {
            headers: {
              Accept: "application/dns-json",
            },
          }
        )
          .then((response) => response.json())
          .then((data: DNSResponse) => {
            if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
              return data.Answer;
            }
            return [];
          })
          .catch(() => [])
      );

      const allResults = await Promise.all(queries);
      const endTime = performance.now();
      setQueryTime(endTime - startTime);

      // Merge and deduplicate results
      const combinedResults = allResults.flat();
      
      if (combinedResults.length > 0) {
        // Group by record type and deduplicate
        const uniqueResults = Array.from(
          new Map(
            combinedResults.map((record) => [
              `${record.name}-${record.type}-${record.data}`,
              record,
            ])
          ).values()
        );

        setResults(uniqueResults);
        toast.success(`Query successful, found ${uniqueResults.length} record(s)`);
      } else {
        setResults([]);
        toast.info("No records found");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Query failed: ${error.message}`);
      } else {
        toast.error("Query failed");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      queryDNS();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Domain Name</label>
          <Input
            placeholder="e.g. example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onBlur={handleDomainBlur}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <span className="text-xs text-muted-foreground">
            Will automatically query all DNS record types
          </span>
        </div>

        <Button onClick={queryDNS} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {loading ? "Querying..." : "Query All Records"}
        </Button>
      </div>

      {queryTime > 0 && (
        <div className="text-sm text-muted-foreground">
          Query time: {queryTime.toFixed(2)} ms
        </div>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3 flex-1 overflow-auto">
          <div className="text-sm font-medium">Query Results:</div>
          <div className="space-y-2">
            {results.map((record, index) => (
              <div
                key={index}
                className="border rounded-md p-3 bg-card text-card-foreground"
              >
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div>
                  <div className="font-mono break-all">{record.name}</div>
                  <div className="text-muted-foreground">Type:</div>
                  <div>{getRecordTypeName(record.type)}</div>
                  <div className="text-muted-foreground">TTL:</div>
                  <div>{record.TTL} seconds</div>
                  <div className="text-muted-foreground">Data:</div>
                  <div className="font-mono break-all">{record.data}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tool;

