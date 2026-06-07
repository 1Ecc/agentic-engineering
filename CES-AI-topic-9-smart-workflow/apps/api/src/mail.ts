import nodemailer from "nodemailer";

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function sendMail(input: SendMailInput): Promise<{ message_id: string }> {
  const host = process.env.SMTP_HOST ?? "smtpinternal.lenovo.com";
  const port = Number(process.env.SMTP_PORT ?? 25);
  const user = process.env.SMTP_USERNAME ?? "xiayu12@lenovo.com";
  const pass = required(process.env.SMTP_PASSWORD, "SMTP_PASSWORD");
  const fromName = process.env.SMTP_MAILER ?? "lenovo";

  if (!input.to.length) throw new Error("to is required");
  if (!input.subject.trim()) throw new Error("subject is required");
  if (!input.body.trim()) throw new Error("body is required");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: (process.env.SMTP_SECURE ?? "tls").toLowerCase() === "tls",
    auth: {
      user,
      pass,
    },
  });

  const result = await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: input.to.join(","),
    cc: input.cc?.join(","),
    subject: input.subject,
    text: input.body,
  });

  return { message_id: result.messageId };
}
