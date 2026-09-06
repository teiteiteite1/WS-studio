import type { Metadata } from "next";
import ShafuClient from "./ShafuClient";

export const metadata: Metadata = {
  title: "SHAFU · WS studio",
  description: "社不ちゃん専用の動画制作・ストーリー管理システム",
  robots: { index: false, follow: false },
};

export default function ControlPage() {
  return <ShafuClient />;
}
