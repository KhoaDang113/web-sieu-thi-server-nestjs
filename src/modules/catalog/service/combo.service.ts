import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Combo, ComboDocument } from '../schema/combo.schema';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';

@Injectable()
export class ComboService {
  constructor(
    @InjectModel(Combo.name)
    private comboModel: Model<ComboDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<Combo[]> {
    return await this.comboModel
      .find({
        is_active: true,
        is_deleted: false,
      })
      .select('image name description is_active')
      .lean();
  }

  async findById(id: string): Promise<Combo> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID combo không hợp lệ');
    }

    const combo = await this.comboModel
      .findOne({ _id: id, is_deleted: false })
      .select('image name description is_active')
      .exec();

    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }

    return combo;
  }

  async create(
    createComboDto: CreateComboDto,
    file: Express.Multer.File,
  ): Promise<{ message: string }> {
    let imageUrl = createComboDto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/combos',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const combo = new this.comboModel({
      ...createComboDto,
      image: imageUrl,
      is_active:
        createComboDto.is_active !== undefined
          ? createComboDto.is_active
          : true,
    });

    await combo.save();
    return {
      message: 'create combo success',
    };
  }

  async update(
    id: string,
    updateComboDto: UpdateComboDto,
    file: Express.Multer.File,
  ): Promise<Combo> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID combo không hợp lệ');
    }

    let imageUrl = updateComboDto.image;

    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/combos',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const updateData: Record<string, any> = {
      ...updateComboDto,
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const combo = await this.comboModel
      .findOneAndUpdate(
        { _id: id, is_deleted: false },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!combo) {
      throw new NotFoundException('Không tìm thấy combo');
    }

    return combo;
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID combo không hợp lệ');
    }

    const result = await this.comboModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Không tìm thấy combo');
    }

    return { message: 'Xóa combo thành công' };
  }

  async getCombosAdmin(
    page: number = 1,
    limit: number = 10,
    key?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = { is_deleted: false };

    if (key && typeof key === 'string' && key.trim().length > 0) {
      query.$or = [
        { name: { $regex: key.trim(), $options: 'i' } },
        { description: { $regex: key.trim(), $options: 'i' } },
      ];
    }

    const [combos, total] = await Promise.all([
      this.comboModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .select('_id name image description is_active')
        .lean(),
      this.comboModel.countDocuments(query),
    ]);

    return {
      total,
      page,
      limit,
      combos,
    };
  }
}
