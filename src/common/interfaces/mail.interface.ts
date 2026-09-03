// src/common/interfaces/mail.interface.ts

export interface SendMailInput {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
}

export interface MailService {
    send(input: SendMailInput): Promise<void>;
}
