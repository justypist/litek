import { useState, type FC } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRightIcon, ArrowLeftIcon } from "lucide-react";

const Tool: FC = () => {
  const [text, setText] = useState<string>("");

  const encode = () => {
    try {
      const encoded64 = btoa(text);
      setText(encoded64);
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
      const decoded64 = atob(text);
      setText(decoded64);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("decoding failed");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-[400px]">
      <Textarea
        className="flex-1 resize-none"
        placeholder="Enter text to encode or decode"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2 justify-center">
        <Button onClick={encode} disabled={!text.trim()}>
          <ArrowRightIcon className="size-4" />
          <span className="ml-2">Encode</span>
        </Button>
        <Button onClick={decode} disabled={!text.trim()}>
          <ArrowLeftIcon className="size-4" />
          <span className="ml-2">Decode</span>
        </Button>
      </div>
    </div>
  );
};

export default Tool;

