import { useState, useRef, useCallback, useEffect } from "react";
import { Music, Pause, Play, ChevronDown, ChevronUp } from "lucide-react";

const DEFAULT_PLAYLIST_URI = "spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM"; // Lo-fi beats
const SPOTIFY_PLAYLIST_URL = "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4FyS8kM";

interface SpotifyMiniPlayerProps {
  /** When this transitions from >0 to 0, auto-pause after 10s */
  cooldown?: number;
}

export default function SpotifyMiniPlayer({ cooldown = -1 }: SpotifyMiniPlayerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState("Lo-fi Focus Beats");
  const [loaded, setLoaded] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<any>(null);
  const prevCooldownRef = useRef(cooldown);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const loadSpotify = useCallback(() => {
    if (loaded || scriptRef.current) return;
    setLoaded(true);
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    scriptRef.current = script;
    document.body.appendChild(script);

    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      if (!embedRef.current) return;
      const options = {
        uri: DEFAULT_PLAYLIST_URI,
        width: "100%",
        height: "80",
        theme: "0",
      };
      const callback = (controller: any) => {
        controllerRef.current = controller;
        controller.addListener("playback_update", (e: any) => {
          setIsPlaying(!e.data.isPaused);
        });
        controller.addListener("ready", () => {
          // Don't auto-play
        });
      };
      IFrameAPI.createController(embedRef.current, options, callback);
    };
  }, [loaded]);

  useEffect(() => {
    return () => {
      scriptRef.current?.remove();
      delete (window as any).onSpotifyIframeApiReady;
    };
  }, []);

  // Session-end auto-pause: when cooldown goes from >0 to 0
  useEffect(() => {
    if (prevCooldownRef.current > 0 && cooldown === 0 && isPlaying) {
      pauseTimerRef.current = setTimeout(() => {
        controllerRef.current?.togglePlay();
      }, 10000);
    }
    prevCooldownRef.current = cooldown;
    return () => {
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [cooldown, isPlaying]);

  const handleTogglePlay = useCallback(() => {
    if (!controllerRef.current) {
      loadSpotify();
      window.open(SPOTIFY_PLAYLIST_URL, "_blank", "noopener,noreferrer");
      return;
    }
    controllerRef.current.togglePlay();
  }, [loadSpotify]);

  return (
    <div className="fixed bottom-6 left-6 z-50 font-body">
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Expand music player"
        >
          <Music size={14} />
          <ChevronUp size={14} />
        </button>
      ) : (
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-lg w-[280px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <Music size={14} className="text-primary flex-shrink-0" />
              <span className="text-xs text-foreground truncate">{trackName}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleTogglePlay}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Collapse player"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
          {/* Hidden Spotify controller target, loaded only after a user presses play. */}
          <div ref={embedRef} className="sr-only h-0 w-0 overflow-hidden" aria-hidden="true" />
          {/* Session complete message */}
          {cooldown === 0 && prevCooldownRef.current === 0 && (
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-center border-t border-border">
              Session complete.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
