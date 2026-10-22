import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, unknown>;
};

export type BounceOrComplaintEvent = {
  type: "bounce" | "complaint";
  email: string;
  timestamp: Date;
  reason?: string;
  rawPayload?: unknown;
};

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
  handleWebhook?(event: BounceOrComplaintEvent): Promise<void>;
}

export class ConsoleDevMailer implements Mailer {
  private sentMessages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sentMessages.push(message);
    if (process.env.NODE_ENV !== "test") {
      console.log("\n--- [CONSOLE MAILER] ---");
      console.log(`To: ${message.to}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Body (Plain):\n${message.text}`);
      if (message.html) {
        console.log(`Body (HTML):\n${message.html}`);
      }
      console.log("------------------------\n");
    }
  }

  async handleWebhook(event: BounceOrComplaintEvent): Promise<void> {
    console.warn(`[MAILER WEBHOOK] ${event.type} for ${event.email}: ${event.reason ?? "none"}`);
  }

  getSentMessages(): readonly EmailMessage[] {
    return this.sentMessages;
  }

  clear(): void {
    this.sentMessages = [];
  }
}

export class ResendMailer implements Mailer {
  constructor(
    private apiKey: string,
    private fromEmail: string = "Migration Hub <onboarding@resend.dev>"
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[RESEND MAILER ERROR]", errText);
    }
  }

  async handleWebhook(event: BounceOrComplaintEvent): Promise<void> {
    console.warn(`[RESEND WEBHOOK] ${event.type} for ${event.email}: ${event.reason ?? "none"}`);
  }
}

export function createMailerFromEnv(): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const from = process.env.EMAIL_FROM || "Migration Hub <onboarding@resend.dev>";
    return new ResendMailer(apiKey, from);
  }
  return new ConsoleDevMailer();
}

