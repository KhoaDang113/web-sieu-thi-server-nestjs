import { Injectable } from '@nestjs/common';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
} from './schema/payment-transaction.schema';
import { Model, ClientSession } from 'mongoose';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { VNPay } from 'vnpay/vnpay';
import { HashAlgorithm, ProductCode, VnpLocale } from 'vnpay/enums';
import { dateFormat, ignoreLogger } from 'vnpay/utils';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Types } from 'mongoose';

import type { QueryDrResponseFromVNPay } from 'vnpay/types-only';
import { Order, OrderDocument } from '../order/schema/order.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(PaymentTransaction.name)
    private paymentTransactionModel: Model<PaymentTransactionDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  private vnpay = new VNPay({
    // Thông tin cấu hình bắt buộc
    tmnCode: process.env.VNPAY_TMN_CODE as string,
    secureSecret: process.env.VNPAY_SECURE_SECRET as string,
    vnpayHost: process.env.VNPAY_HOST as string,

    // Cấu hình tùy chọn
    testMode: true, // Chế độ test
    hashAlgorithm: HashAlgorithm.SHA512, // Thuật toán mã hóa
    enableLog: true, // Bật/tắt ghi log
    loggerFn: ignoreLogger, // Hàm xử lý log tùy chỉnh
  });

  async createPaymentTransaction(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<string> {
    const newPaymentTransaction = new this.paymentTransactionModel({
      ...createPaymentDto,
      orderId: new Types.ObjectId(createPaymentDto.orderId),
      user_id: new Types.ObjectId(userId),
      status: 'pending',
    });
    await newPaymentTransaction.save();

    const vnpayResponse = this.vnpay.buildPaymentUrl({
      vnp_Amount: createPaymentDto.amount,
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: createPaymentDto.orderId,
      vnp_OrderInfo: `Thanh toán đơn hàng ${createPaymentDto.orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: 'http://localhost:3000/api/payment/get-info',
      vnp_Locale: VnpLocale.VN, // Ngôn ngữ hiển thị
      vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'), // Thời gian tạo giao dịch
      vnp_ExpireDate: dateFormat(
        new Date(new Date().getTime() + 30 * 60 * 1000),
        'yyyyMMddHHmmss',
      ),
    });

    return vnpayResponse;
  }

  async verifyPaymentCallback(query: QueryDrResponseFromVNPay): Promise<{
    isValid: boolean;
    payment?: PaymentTransaction;
    redirectUrl?: string;
  }> {
    const isValid = this.vnpay.verifyReturnUrl(query);
    if (!isValid) {
      return { isValid: false };
    }

    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionStatus } = query;

    const payment = await this.paymentTransactionModel.findOne({
      orderId: new Types.ObjectId(vnp_TxnRef),
    });
    if (!payment) {
      return { isValid: true };
    }

    const session: ClientSession = await this.connection.startSession();

    try {
      return await session.withTransaction(async () => {
        if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
          payment.status = 'completed';
          await payment.save({ session });

          const order = await this.orderModel
            .findById(vnp_TxnRef)
            .session(session);
          if (!order) {
            await session.abortTransaction();
            return { isValid: true };
          }

          order.payment_status = 'paid';
          order.paid_at = new Date();
          await order.save({ session });

          return {
            isValid: true,
            payment,
            redirectUrl: `${process.env.FRONTEND_URL}/payment/success?orderId=${vnp_TxnRef}`,
          };
        } else {
          payment.status = 'failed';
          await payment.save({ session });

          return {
            isValid: true,
            payment,
            redirectUrl: `${process.env.FRONTEND_URL}/payment/failed?orderId=${vnp_TxnRef}`,
          };
        }
      });
    } finally {
      await session.endSession();
    }
  }
}
