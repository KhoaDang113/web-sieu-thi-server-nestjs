import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from '../refresh-tokens/schemas/refresh-token.schema';
import { CustomJwtService } from './customJwt.service';
import { RefreshTokenService } from '../refresh-tokens/refresh-token.service';
import { SmsService } from '../sms/sms.service';
import { JwtPayload } from 'jsonwebtoken';
import { RegisterEmailResponseDto } from './dto/register-email-response.dto';
import { VerificationService } from '../verification/verification.service';
import {
  Verification,
  VerificationDocument,
} from '../verification/schema/verification.schema';
import { MailerService } from '../mailer/mailer.service';
import { ValidateGoogleUserDto } from './dto/validate-google-user.dto';

const OTP_TTL_MIN = 5;
const OTP_LEN = 6;
const OTP_SALT_ROUNDS = 10;
const RESEND_WINDOW_SEC = 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Verification.name)
    private verificationModel: Model<VerificationDocument>,
    private jwtService: CustomJwtService,
    private refreshTokenService: RefreshTokenService,
    private smsService: SmsService,
    private verificationService: VerificationService,
    private mailer: MailerService,
  ) {}

  private async sendEmailOtp(email: string, code: string) {
    const html = `
      <div>
        <h2>Mã xác thực</h2>
        <p>Mã OTP: <b>${code}</b></p>
        <p>Hiệu lực ${OTP_TTL_MIN} phút.</p>
      </div>`;
    await this.mailer.sendEmail({
      to: email,
      subject: 'Xác thực đăng ký',
      html,
    });
  }

  async registerEmail(
    email: string,
    password: string,
    name: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<RegisterEmailResponseDto> {
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    const newUser = new this.userModel({
      email,
      password,
      name,
      authProvider: 'local',
    });

    await newUser.save();

    await this.createEmailVerification(email);

    const accessToken = this.jwtService.signAccessToken(
      newUser._id.toString(),
      newUser.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(
      newUser._id.toString(),
    );

    await this.refreshTokenService.addRefreshToken(
      newUser._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user: newUser, accessToken, refreshToken };
  }

  async createEmailVerification(email: string) {
    const latest = await this.verificationModel
      .findOne({ target: email, type: 'email_otp' })
      .sort({ createdAt: -1 })
      .lean();

    if (latest && latest.createdAt) {
      const deltaSec =
        (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
      if (deltaSec < RESEND_WINDOW_SEC) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(RESEND_WINDOW_SEC - deltaSec)}s to resend OTP`,
        );
      }
    }

    const otp = await this.verificationService.generateOtp(
      email,
      'email_otp',
      OTP_LEN,
      OTP_SALT_ROUNDS,
    );

    await this.sendEmailOtp(email, otp);
    return { success: true };
  }

  async verifyEmailOtp(email: string, code: string) {
    await this.verificationService.validateOtp(email, code, 'email_otp');

    await this.userModel.updateOne(
      {
        email: email.toLowerCase(),
        $or: [
          { emailVerifiedAt: { $exists: false } },
          { emailVerifiedAt: null },
        ],
      },
      { $set: { emailVerifiedAt: new Date() } },
    );

    await this.verificationModel.deleteMany({
      target: email,
      type: 'email_otp',
    });

    return { success: true };
  }

  private generateVerificationCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async registerPhone(phone: string, name: string) {
    const existingUser = await this.userModel.findOne({ phone });
    if (existingUser) {
      throw new HttpException(
        'Phone number already registered',
        HttpStatus.CONFLICT,
      );
    }

    const newUser = new this.userModel({
      phone,
      name,
      authProvider: 'local',
    });

    const verificationCode = this.generateVerificationCode();
    newUser.phoneVerificationCode = verificationCode;
    newUser.phoneVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    await newUser.save();

    const smsResult = await this.smsService.sendVerificationCode(
      phone,
      verificationCode,
    );
    if (!smsResult.success) {
      throw new HttpException(
        'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { user: newUser, userId: newUser._id };
  }

  async verifyCode(
    userId: string,
    code: number,
    userAgent: string,
    ipAddress: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      user.phoneVerificationCode !== code ||
      !user.phoneVerificationExpires ||
      user.phoneVerificationExpires < new Date(Date.now())
    ) {
      throw new HttpException(
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined as unknown as number;
    user.phoneVerificationExpires = undefined as unknown as Date;
    await user.save();

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async loginEmail(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new HttpException('user not found', HttpStatus.UNAUTHORIZED);
    }

    if (!user.password) {
      throw new HttpException('password not found', HttpStatus.UNAUTHORIZED);
    }

    const isMatch = await this.comparePassword(password, user.password);
    if (!isMatch) {
      throw new HttpException('password wrong', HttpStatus.UNAUTHORIZED);
    }

    if (!user.emailVerifiedAt && user.email) {
      // Gửi OTP xác thực email
      await this.createEmailVerification(user.email);

      throw new HttpException(
        'Email verification required. Please check your email for OTP.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async loginPhone(phone: string) {
    const user = await this.userModel.findOne({ phone });
    if (!user) {
      throw new HttpException('Phone number not found', HttpStatus.NOT_FOUND);
    }

    const smsCode = this.generateVerificationCode();
    user.loginSmsCode = smsCode;
    user.loginSmsExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    const smsResult = await this.smsService.sendVerificationCode(
      phone,
      smsCode,
    );
    if (!smsResult.success) {
      throw new HttpException(
        'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      message: 'Verification code sent to your phone',
      userId: user._id,
    };
  }

  async verifyLoginSms(
    userId: string,
    code: number,
    userAgent: string,
    ipAddress: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (
      user.loginSmsCode !== code ||
      !user.loginSmsExpires ||
      user.loginSmsExpires < new Date()
    ) {
      throw new HttpException(
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Xóa SMS code sau khi xác thực thành công
    user.loginSmsCode = undefined as unknown as number;
    user.loginSmsExpires = undefined as unknown as Date;
    await user.save();

    const accessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    const refreshToken = this.jwtService.signRefreshToken(user._id.toString());

    await this.refreshTokenService.addRefreshToken(
      user._id.toString(),
      refreshToken,
      userAgent,
      ipAddress,
    );

    return { user, accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const decoded: JwtPayload = this.jwtService.verifyRefreshToken(
      refreshToken,
    ) as JwtPayload;
    if (decoded.type !== 'refresh') {
      throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userModel.findById(decoded.id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const newAccessToken = this.jwtService.signAccessToken(
      user._id.toString(),
      user.role,
    );
    return { accessToken: newAccessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const decoded: JwtPayload = this.jwtService.verifyRefreshToken(
      refreshToken,
    ) as JwtPayload;
    if (decoded.type !== 'refresh') {
      throw new HttpException('Invalid token type', HttpStatus.UNAUTHORIZED);
    }

    await this.refreshTokenModel.deleteOne({
      userId: decoded.id,
      token: refreshToken,
    });
  }

  async logoutAll(userId: string) {
    await this.refreshTokenService.removeAllRefreshTokens(userId);
    return true;
  }

  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select(
        '-password -refreshTokens -verificationCode -verificationExpires -resetPasswordToken -resetPasswordExpires -__v',
      );
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private async comparePassword(
    candidatePassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  async validateGoogleUser(googleUser: ValidateGoogleUserDto) {
    let user = await this.userModel.findOne({
      providerId: googleUser.providerId,
      authProvider: 'google',
    });

    if (user) {
      return user;
    }

    user = await this.userModel.findOne({ email: googleUser.email });

    if (user) {
      user.providerId = googleUser.providerId;
      user.authProvider = 'google';
      user.avatar = googleUser.avatar;
      await user.save();
      return user;
    }

    // Tạo user mới
    const newUser = new this.userModel({
      name: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.avatar,
      authProvider: 'google',
      providerId: googleUser.providerId,
      emailVerifiedAt: new Date(), // Google OAuth đã xác thực email
    });

    await newUser.save();
    return newUser;
  }
}
