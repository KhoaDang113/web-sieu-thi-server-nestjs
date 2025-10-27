import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  async sendEmail(sendEmailDto: SendEmailDto): Promise<{ success: boolean }> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"No-Reply" <no-reply@example.com>',
        to: sendEmailDto.to,
        subject: sendEmailDto.subject,
        html: sendEmailDto.html,
      });
      return { success: true };
    } catch (error) {
      console.log('error', error);
      throw new Error('Failed to send email');
    }
  }
}
