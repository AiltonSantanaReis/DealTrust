import { Inject, Injectable } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { API_CONFIG, type ApiConfig } from "../config/api-config.js";

type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

@Injectable()
export class EmailDeliveryService {
  private readonly transporter: Transporter;

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.transporter = createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      ...(config.smtpUser
        ? {
            auth: {
              user: config.smtpUser,
              pass: config.smtpPassword
            }
          }
        : {})
    });
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const result = await this.transporter.sendMail({
      from: this.config.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text
    });

    if (!hasAcceptedRecipient(result)) {
      throw new Error("SMTP server did not accept the email recipient.");
    }
  }
}

function hasAcceptedRecipient(result: unknown): boolean {
  if (!isRecord(result)) {
    return false;
  }

  const accepted = result.accepted;

  return Array.isArray(accepted) && accepted.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
