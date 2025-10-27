import { useState, type FC } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Tool: FC = () => {
  const [json, setJson] = useState<string>("");

  const validateJson = () => {
    try {
      JSON.parse(json);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Invalid JSON");
      }
      return false;
    }
  };

  const minifyJson = () => {
    if (!validateJson()) return;
    const formattedJson = JSON.stringify(JSON.parse(json), null, 0);
    setJson(formattedJson);
    toast.success("Minified successfully");
  };

  const prettifyJson = () => {
    if (!validateJson()) return;
    const formattedJson = JSON.stringify(JSON.parse(json), null, 2);
    setJson(formattedJson);
    toast.success("JSON prettified successfully");
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Textarea className="flex-1 w-full resize-none" placeholder="Enter your JSON here" value={json} onChange={(e) => setJson(e.target.value)} />
      <div className="flex flex-row gap-2">
        <Button onClick={minifyJson}>Minify</Button>
        <Button onClick={prettifyJson}>Pretty</Button>
      </div>
    </div>
  );
};

export default Tool;
