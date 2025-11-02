import { useState, type FC } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";

const Tool: FC = () => {
  const [decoded, setDecoded] = useState<string>("");
  const [encoded, setEncoded] = useState<string>("");

  const encode = () => {
    try {
      const encoded64 = btoa(decoded);
      setEncoded(encoded64);
      setDecoded("");
      toast.success("encoded successfully");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("encoding failed");
      }
    }
  };

  const decode = () => {
    try {
      const decoded64 = atob(encoded);
      setDecoded(decoded64);
      setEncoded("");
      toast.success("decoded successfully");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("decoding failed");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full min-h-[400px]">
      <Textarea
        className="flex-1 resize-none min-h-[200px] md:min-h-0"
        placeholder="Enter the original text"
        value={decoded}
        onChange={(e) => setDecoded(e.target.value)}
      />
      <div className="flex md:flex-col gap-2 justify-center">
        <Button onClick={encode} className="flex-1 md:flex-initial">
          <ArrowRightIcon className="size-4" />
          <span className="ml-2">Encode</span>
        </Button>
        <Button onClick={decode} className="flex-1 md:flex-initial">
          <ArrowLeftIcon className="size-4" />
          <span className="ml-2">Decode</span>
        </Button>
      </div>
      <Textarea
        className="flex-1 resize-none min-h-[200px] md:min-h-0"
        placeholder="Enter the Base64 encoded text"
        value={encoded}
        onChange={(e) => setEncoded(e.target.value)}
      />
    </div>
  );
};

export default Tool;

