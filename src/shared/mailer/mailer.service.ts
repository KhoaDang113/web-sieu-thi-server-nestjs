import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';
import { Order, OrderItem } from 'src/modules/order/schema/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Product,
  ProductDocument,
} from 'src/modules/catalog/schema/product.schema';

@Injectable()
export class MailerService {
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

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

  async sendCompanyInvoice(order: Order, invoiceImageUrl?: string) {
    if (!order.is_company_invoice || !order.invoice_info?.email) return;

    const to = order.invoice_info.email;
    const subject = `Hóa đơn công ty cho đơn hàng #${order._id.toString()}`;

    const resolvedNames = await Promise.all(
      (order.items || []).map(async (item: OrderItem) => {
        const pid = item.product_id;
        if (pid && typeof pid === 'object' && 'name' in pid) {
          return pid.name as string;
        }

        try {
          const prod = await this.productModel
            .findById(pid)
            .select('name')
            .lean();
          return prod?.name || String(pid);
        } catch {
          return String(pid);
        }
      }),
    );

    const itemsHtml = (order.items || [])
      .map((item: OrderItem, idx: number) => {
        const prodName = resolvedNames[idx] || String(item.product_id);
        return `
          <tr>
            <td style="padding:4px 8px;border:1px solid #ddd;">${idx + 1}</td>
            <td style="padding:4px 8px;border:1px solid #ddd;">
              ${prodName}
            </td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">
              ${item.quantity}
            </td>
            <td style="padding:4px 8px;border:1px solid #ddd;text-align:right;">
              ${item.total_price.toLocaleString('vi-VN')} ₫
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#333;">
        <h2 style="color:#007e42;">Hóa đơn Công ty</h2>

        <p><b>Công ty:</b> ${order.invoice_info.company_name}</p>
        <p><b>Mã số thuế:</b> ${order.invoice_info.tax_code}</p>
        <p><b>Địa chỉ:</b> ${order.invoice_info.company_address}</p>

        <hr style="margin:16px 0;"/>

        <p><b>Mã đơn hàng:</b> ${order._id.toString()}</p>
        <p><b>Thành tiền:</b> ${order.total.toLocaleString('vi-VN')} ₫</p>

        <h3>Chi tiết sản phẩm</h3>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ddd;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:4px 8px;border:1px solid #ddd;">#</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">Sản phẩm</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">SL</th>
              <th style="padding:4px 8px;border:1px solid #ddd;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${
          invoiceImageUrl
            ? `
        <h3 style="margin-top:20px;">Hình ảnh hóa đơn</h3>
        <p>
          <img src="${invoiceImageUrl}" alt="Hóa đơn" style="max-width:100%;border:1px solid #ddd;border-radius:8px;" />
        </p>
        <p style="font-size:12px;color:#777;">
          Nếu hình không hiển thị, vui lòng mở đường dẫn sau trong trình duyệt:<br/>
          <a href="${invoiceImageUrl}" target="_blank">${invoiceImageUrl}</a>
        </p>
        `
            : ''
        }

        <p style="margin-top:16px;">
          Xin cảm ơn Quý công ty đã mua hàng tại hệ thống của chúng tôi.
        </p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }
}
