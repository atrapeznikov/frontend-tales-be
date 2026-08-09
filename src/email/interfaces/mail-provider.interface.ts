export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: any;
    cid?: string;
  }>;
}

export abstract class MailProvider {
  abstract send(options: SendMailOptions): Promise<void>;
}
