import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Counter | WS studio",
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
