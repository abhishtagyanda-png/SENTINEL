import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTINEL — Operator Dashboard",
  description:
    "Gemma 4-powered, privacy-first public safety system. Explainable AI incident detection with cryptographic forensic integrity.",
  keywords: ["SENTINEL", "AI surveillance", "Gemma 4", "security operations center", "incident detection"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="sentinel-grid-bg min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
