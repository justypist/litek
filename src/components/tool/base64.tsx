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
    <div className="h-[50vh] flex flex-row gap-4 pt-[20vh]">
      <Textarea
        className="flex-1 resize-none"
        placeholder="Enter the original text"
        value={decoded}
        onChange={(e) => setDecoded(e.target.value)}
      />
      <div className="flex flex-col gap-2 justify-center">
        <Button onClick={encode}>
          <ArrowRightIcon className="size-4" />
          Encode
        </Button>
        <Button onClick={decode}>
          <ArrowLeftIcon className="size-4" />
          Decode
        </Button>
      </div>
      <Textarea
        className="flex-1 resize-none"
        placeholder="Enter the Base64 encoded text"
        value={encoded}
        onChange={(e) => setEncoded(e.target.value)}
      />
    </div>
  );
};

export default Tool;

