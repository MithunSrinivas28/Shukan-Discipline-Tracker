import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  userId: string;
  username: string;
  avatarUrl: string | null;
  size?: number;
  editable?: boolean;
  onUploaded?: (url: string) => void;
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AvatarUpload({
  userId,
  username,
  avatarUrl,
  size = 112,
  editable = true,
  onUploaded,
}: AvatarUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Resolve signed URL when avatarUrl is a storage path (not a full URL)
  useEffect(() => {
    let cancelled = false;
    if (!avatarUrl) {
      setSignedUrl(null);
      return;
    }
    if (avatarUrl.startsWith("http")) {
      setSignedUrl(avatarUrl);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(avatarUrl, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path } as any)
      .eq("id", userId);
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    if (signed?.signedUrl) setSignedUrl(signed.signedUrl);
    onUploaded?.(path);
    setUploading(false);
    toast({ title: "Avatar updated" });
  };

  return (
    <div
      className="relative inline-block group"
      style={{ width: size, height: size }}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-border/40 shadow-sm flex items-center justify-center"
      >
        {signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signedUrl}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-serif font-bold text-foreground/70" style={{ fontSize: size / 3 }}>
            {initialsFor(username)}
          </span>
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background border border-border/60 shadow-sm flex items-center justify-center text-foreground/70 hover:text-foreground hover:scale-105 transition-all disabled:opacity-50"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
      {uploading && (
        <div className="absolute inset-0 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center text-xs font-body text-muted-foreground">
          …
        </div>
      )}
    </div>
  );
}
