import { type FC, useState } from "react";
import { RefreshCw, Copy } from "lucide-react";
import * as uuid from 'uuid'
import { nanoid } from 'nanoid'
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface IDGeneratorProps {
  label: string;
  value: string;
  onRegenerate: () => void;
}

const IDGenerator: FC<IDGeneratorProps> = ({ label, value, onRegenerate }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} has been copied to clipboard`);
    } catch (err) {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <span className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm break-all">
          {value}
        </span>
        <Button
          size="icon"
          variant="outline"
          onClick={onRegenerate}
          title="Regenerate"
          className="flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={copyToClipboard}
          title="Copy"
          className="flex-shrink-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const Tool: FC = () => {
  const [uuidV1, setUuidV1] = useState(() => uuid.v1());
  const [uuidV4, setUuidV4] = useState(() => uuid.v4());
  const [uuidV6, setUuidV6] = useState(() => uuid.v6());
  const [uuidV7, setUuidV7] = useState(() => uuid.v7());
  const [nanoId, setNanoId] = useState(() => nanoid());

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm text-muted-foreground">Click the refresh button to regenerate the corresponding ID</span>
      
      <IDGenerator 
        label="UUID Version 1" 
        value={uuidV1} 
        onRegenerate={() => setUuidV1(uuid.v1())} 
      />
      
      <IDGenerator 
        label="UUID Version 4" 
        value={uuidV4} 
        onRegenerate={() => setUuidV4(uuid.v4())} 
      />
      
      <IDGenerator 
        label="UUID Version 6" 
        value={uuidV6} 
        onRegenerate={() => setUuidV6(uuid.v6())} 
      />
      
      <IDGenerator 
        label="UUID Version 7" 
        value={uuidV7} 
        onRegenerate={() => setUuidV7(uuid.v7())} 
      />
      
      <IDGenerator 
        label="Nano ID" 
        value={nanoId} 
        onRegenerate={() => setNanoId(nanoid())} 
      />
    </div>
  );
};

export default Tool;