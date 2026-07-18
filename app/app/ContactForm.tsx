"use client";

import { FormEvent, useState } from "react";

type FormStatus = "idle" | "sending" | "sent" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");

  function submitWithoutAjax(form: HTMLFormElement) {
    const hiddenFields = {
      _subject: "WS studio — New contact",
      _template: "table",
      _url: window.location.href,
      _next: `${window.location.origin}/?sent=1#contact`,
    };

    Object.entries(hiddenFields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    form.action = "https://formsubmit.co/tei.wsstudio@gmail.com";
    form.method = "POST";
    form.submit();
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("_subject", "WS studio — New contact");
    formData.append("_template", "table");
    formData.append("_url", window.location.href);
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

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success === false) {
        throw new Error("Unable to submit form");
      }
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
      submitWithoutAjax(form);
    }
  }

  return (
    <form className="contact-form" method="POST" onSubmit={submitForm}>
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
          {status === "error" && "Switching to secure send…"}
        </p>
      </div>
    </form>
  );
}
