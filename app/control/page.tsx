import type { Metadata } from "next";
import ShafuClient from "./ShafuClient";

export const metadata: Metadata = {
  title: "SHAFU · WS studio",
  description: "社不ちゃん用の20秒×2本動画プロンプト制作・ネタ帳・アーカイブ",
  robots: { index: false, follow: false },
};

export default function ControlPage() {
  return <ShafuClient />;
}
