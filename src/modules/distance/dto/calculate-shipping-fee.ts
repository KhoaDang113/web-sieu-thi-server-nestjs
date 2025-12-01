import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
export class CalculateShippingFeeDto {
  @IsNotEmpty()
  @IsString()
  addressId: string;

  @IsNotEmpty()
  @IsNumber()
  orderTotal: number;
}