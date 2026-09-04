import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights | WS studio",
  description: "WS studio private performance dashboard.",
  robots: { index: false, follow: false },
};

export default function AnalyticsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
