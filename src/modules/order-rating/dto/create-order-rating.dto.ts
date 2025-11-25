import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateOrderRatingDto { 

    @IsNotEmpty()
    order_id: string;

    @IsNotEmpty()
    @Min(1)
    @Max(5)
    rating_overall: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    rating_product_quality?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    rating_packaging?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    rating_delivery_time?: number;

    @IsOptional()
    @IsNumber() 
    @Min(1)
    @Max(5)
    rating_shipper?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsArray()
    images?: string[];
}
