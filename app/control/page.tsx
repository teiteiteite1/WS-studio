import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "WS studio CONTROL",
  robots: { index: false, follow: false },
};

export default function ControlPage() {
  redirect("/control/index.html");
}
