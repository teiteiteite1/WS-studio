import type { Metadata } from "next";
import LearnClient from "./LearnClient";
import LearnSyncBridge from "./LearnSyncBridge";
import "./learn.css";

export const metadata: Metadata = {
  title: "AI 30 | WS studio",
  description: "30日でAIの基本から現在の潮流まで理解するための入門コース。",
  robots: { index: false, follow: false },
};

export default function LearnPage() {
  return (
    <>
      <LearnSyncBridge />
      <LearnClient />
    </>
  );
}
