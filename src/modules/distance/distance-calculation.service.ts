import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DISTANCE_CONFIG } from '../../config/distance.config';
import { Address, AddressDocument } from '../address/schema/address.schema';

export interface DistanceResult {
  distance: number;
  duration: number;
  shippingFee: number;
  estimatedDeliveryTime: Date;
}

@Injectable()
export class DistanceCalculationService {
  private ai: GoogleGenAI;
  private model: string = 'gemini-2.0-flash';

  constructor(
    private configService: ConfigService,
    @InjectModel(Address.name)
    private readonly addressModel: Model<AddressDocument>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async calculateDistanceAndFeeFromAddressId(
    addressId: string,
    orderTotal: number,
  ): Promise<DistanceResult> {
    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('Invalid address ID');
    }

    const address = await this.addressModel.findOne({
      _id: new Types.ObjectId(addressId),
      is_deleted: false,
      is_active: true,
    });

    if (!address) {
      throw new NotFoundException('Address not found or not accessible');
    }

    const fullAddress = `${address.address}, ${address.ward}, ${address.district}, ${address.city}`;
    return await this.calculateDistanceAndFee(fullAddress, orderTotal);
  }

  async calculateDistanceAndFee(
    userAddress: string,
    orderTotal: number,
  ): Promise<DistanceResult> {
    try {
      const storeLocation = DISTANCE_CONFIG.STORE_LOCATION;
      const storeAddress = `${storeLocation.address} (${storeLocation.latitude}, ${storeLocation.longitude})`;

      const prompt = `Hãy tính khoảng cách và thời gian di chuyển chính xác giống như google maps (bằng xe máy) di chuyển trên đường thật chứ không phải tính bằng đường chim bay từ địa chỉ:
      "${storeAddress}"
      đến địa chỉ:
      "${userAddress}"

      Trả về kết quả theo định dạng JSON chính xác như sau (chỉ trả về JSON, không có text thêm):
      {
        "distance": <số km, kiểu số>,
        "duration": <số phút, kiểu số>
      }

      Ví dụ: {"distance": 5.2, "duration": 15}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });

      
      const text = response.text?.trim();
      console.log(text);
      
      let jsonText = text;
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText || '{}');

      if (
        typeof result.distance !== 'number' ||
        typeof result.duration !== 'number'
      ) {
        throw new Error('Invalid response format from AI');
      }

      const distance = result.distance;
      const duration = result.duration;

      let shippingFee = this.calculateShippingFee(distance, orderTotal);

      const totalMinutes =
        duration + DISTANCE_CONFIG.DELIVERY.PREPARATION_TIME;
      const estimatedDeliveryTime = new Date(
        Date.now() + totalMinutes * 60 * 1000,
      );

      return {
        distance: Math.round(distance * 10) / 10,
        duration: Math.round(duration),
        shippingFee: Math.round(shippingFee),
        estimatedDeliveryTime,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error calculating distance:', error);
      throw new BadRequestException(
        'Failed to calculate delivery distance. Please check the address is valid.',
      );
    }
  }

  private calculateShippingFee(distance: number, orderTotal: number): number {
    // Free shipping for deliveries under 2km
    if (distance < DISTANCE_CONFIG.SHIPPING_FEE.FREE_SHIPPING_DISTANCE) {
      return 0;
    }
    
    const baseFee = DISTANCE_CONFIG.SHIPPING_FEE.BASE_FEE;
    const feePerKm = DISTANCE_CONFIG.SHIPPING_FEE.FEE_PER_KM;

    return baseFee + distance * feePerKm;
  }

  getEstimatedFee(distance: number, orderTotal: number): number {
    return Math.round(this.calculateShippingFee(distance, orderTotal));
  }
}
