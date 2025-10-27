import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomJwtService } from './customJwt.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { UserInfoGuard } from './guards/user-info.guard';
import { GoogleStrategy } from './utils/google.strategy';
import { MailerModule } from '../mailer/mailer.module';
import { RefreshTokenModule } from '../refresh-tokens/refresh-token.module';
import { VerificationModule } from '../verification/verification.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailerModule,
    RefreshTokenModule,
    VerificationModule,
    SmsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    CustomJwtService,
    EmailVerifiedGuard,
    UserInfoGuard,
    GoogleStrategy,
  ],
  exports: [AuthService, CustomJwtService, EmailVerifiedGuard, UserInfoGuard],
})
export class AuthModule {}
