import type { Metadata } from "next";
import BriefClient from "./BriefClient";
import "./brief.css";

export const metadata: Metadata = {
  title: "Brief | WS studio",
  description: "AI・泌尿器科・透析の重要ニュースと論文を短く追うためのパーソナルブリーフ。",
  robots: { index: false, follow: false },
};

export default function BriefPage() {
  return <BriefClient />;
}
