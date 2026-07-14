"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("_subject", "WS studio — New contact");
    formData.append("_template", "table");
    setStatus("sending");

    try {
      const response = await fetch(
        "https://formsubmit.co/ajax/tei.wsstudio@gmail.com",
        {
          method: "POST",
          headers: { Accept: "application/json" },
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Unable to submit form");
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" onSubmit={submitForm}>
      <input className="form-honey" type="text" name="_honey" tabIndex={-1} autoComplete="off" />
      <div className="form-row">
        <label>
          <span>Name</span>
          <input type="text" name="name" required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" required />
        </label>
      </div>
      <label>
        <span>Subject</span>
        <input type="text" name="subject" required />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={7} required />
      </label>
      <div className="form-submit-row">
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="form-status" aria-live="polite">
          {status === "sent" && "Message sent."}
          {status === "error" && "Unable to send. Please try again."}
        </p>
      </div>
    </form>
  );
}
