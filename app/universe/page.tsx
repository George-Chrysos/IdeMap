"use client";

import { useEffect, useState } from "react";
import AssistantHud from "@/components/hud/AssistantHud";

// ============================================================
// IdeMap — Universe Route (Direct Orbital Solar System Atlas)
// ============================================================
export default function UniversePage() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    setSrc(`/atlas.html${search}${hash}`);
  }, []);

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0D0F0E]">
      {src && (
        <iframe
          src={src}
          title="Idemap 2D Orbital Solar System Atlas"
          className="w-full h-full border-0 m-0 p-0 block"
        />
      )}
      <AssistantHud />
    </main>
  );
}
