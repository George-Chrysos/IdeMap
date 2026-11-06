// ============================================================
// IdeMap — Direct Orbital Solar System Atlas
// ============================================================
export default function Page() {
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0D0F0E]">
      <iframe
        src="/atlas.html"
        title="Idemap 2D Orbital Solar System Atlas"
        className="w-full h-full border-0 m-0 p-0 block"
      />
    </main>
  );
}
