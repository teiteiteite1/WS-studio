import { NextResponse } from "next/server";

const endpoint = "https://formsubmit.co/ajax/tei.wsstudio@gmail.com";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();

    if (readText(incoming, "website")) {
      return NextResponse.json({ ok: true });
    }

    const name = readText(incoming, "name");
    const email = readText(incoming, "email");
    const subject = readText(incoming, "subject");
    const message = readText(incoming, "message");

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (
      name.length > 100 ||
      email.length > 254 ||
      subject.length > 200 ||
      message.length > 5000
    ) {
      return NextResponse.json(
        { ok: false, error: "Message is too long" },
        { status: 400 },
      );
    }

    const payload = new FormData();
    payload.append("name", name);
    payload.append("email", email);
    payload.append("subject", subject);
    payload.append("message", message);
    payload.append("_subject", `WS studio — ${subject}`);
    payload.append("_template", "table");
    payload.append("_captcha", "false");
    payload.append("_replyto", email);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "User-Agent": "WS-studio-contact/1.0",
      },
      body: payload,
      cache: "no-store",
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || result?.success === false) {
      console.error("Contact form delivery failed", {
        status: response.status,
        result,
      });
      return NextResponse.json(
        { ok: false, error: "Delivery service rejected the message" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form error", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected contact form error" },
      { status: 500 },
    );
  }
}
