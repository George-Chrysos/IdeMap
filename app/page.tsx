"use client";

import { useEffect, useState } from "react";

// ============================================================
// IdeMap — Direct Orbital Solar System Atlas
// Forwards any Supabase OAuth hash/search tokens to /atlas.html
// ============================================================
export default function Page() {
  const [src, setSrc] = useState("/atlas.html");

  useEffect(() => {
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    if (search || hash) {
      setSrc(`/atlas.html${search}${hash}`);
    }
  }, []);

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0D0F0E]">
      <iframe
        src={src}
        title="Idemap 2D Orbital Solar System Atlas"
        className="w-full h-full border-0 m-0 p-0 block"
      />
    </main>
  );
}
