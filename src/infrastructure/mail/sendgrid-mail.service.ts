// src/infrastructure/mail/sendgrid-mail.service.ts

import sgMail, {MailDataRequired} from "@sendgrid/mail";
import {logger} from "../../config/logger";
import {AppError} from "../../common/utils/errors";
import Messages from "../../common/utils/messages";
import {MailService, SendMailInput,} from "../../common/interfaces/mail.interface";

export class SendGridMailService implements MailService {
    constructor(apiKey: string) {
        sgMail.setApiKey(apiKey);
    }

    async send(input: SendMailInput): Promise<void> {
        try {
            const message: MailDataRequired = {
                to: input.to,
                from: input.from,
                subject: input.subject,
                text: input.text ?? "",
                ...(input.html !== undefined
                    ? {html: input.html}
                    : {}),
            };

            await sgMail.send(message);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unknown email delivery error";

            logger.error(
                {error: message},
                "Failed to send email",
            );

            throw new AppError(
                Messages.UNABLE_TO_SEND_EMAIL.message,
                Messages.UNABLE_TO_SEND_EMAIL.code,
                500,
            );
        }
    }
}
