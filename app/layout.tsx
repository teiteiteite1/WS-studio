import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WS studio — Creative Studio",
  description: "WS studio — Illustration, Music, Film and Character.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
