"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.error ?? "Unable to submit form");
      }

      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" method="POST" onSubmit={submitForm}>
      <input
        className="form-honey"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="form-row">
        <label>
          <span>Name</span>
          <input type="text" name="name" maxLength={100} required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" maxLength={254} required />
        </label>
      </div>
      <label>
        <span>Subject</span>
        <input type="text" name="subject" maxLength={200} required />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={7} maxLength={5000} required />
      </label>
      <div className="form-submit-row">
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="form-status" aria-live="polite">
          {status === "sent" && "Message sent. Thank you."}
          {status === "error" && "Could not send. Please try again in a moment."}
        </p>
      </div>
    </form>
  );
}
