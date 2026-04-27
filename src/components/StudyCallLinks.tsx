import { Video, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MEET_LINK = "https://meet.google.com/wzm-igjw-asg";

export default function StudyCallLinks({ className = "" }: { className?: string }) {
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MEET_LINK);
      toast({ title: "Link copied", description: "Share it with your study partner." });
    } catch {
      toast({ title: "Couldn't copy", description: MEET_LINK, variant: "destructive" });
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(MEET_LINK, "_blank", "noopener,noreferrer")}
        className="font-body"
      >
        <Video size={14} className="mr-1.5" />
        Join Study Call
      </Button>
      <Button size="sm" variant="ghost" onClick={copy} className="font-body">
        <Copy size={14} className="mr-1.5" />
        Copy Link
      </Button>
    </div>
  );
}
