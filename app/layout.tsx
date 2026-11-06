// ============================================================
// IdeMap — Root Layout
// ============================================================
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idemap — 2D Orbital Atlas",
  description: "Navigate your life as a 2D orbital solar system",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full w-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full w-full m-0 p-0 overflow-hidden bg-[#0D0F0E]">
        {children}
      </body>
    </html>
  );
}
