import { useEffect, useState } from "react";
import FlipClock from "@/components/timer/FlipClock";

export default function FlipPreview() {
  const [s, setS] = useState(1500);
  useEffect(() => {
    const i = setInterval(() => setS((v) => v - 1), 1000);
    return () => clearInterval(i);
  }, []);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const t = `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return (
    <div className="py-20 flex flex-col items-center gap-16">
      <FlipClock time={t} label="Focus" size="lg" running />
      <FlipClock time={`01:${t}`} label="Studying" size="md" running />
    </div>
  );
}
