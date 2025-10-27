export interface IUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isLocked: boolean;
  isVerified: boolean;
  verificationCode: number;
  verificationExpires: Date;
  authProvider: string;
  providerId: string;
  resetPasswordToken: string;
  resetPasswordExpires: Date;
  createdAt: Date;
  updatedAt: Date;

  generateVerificationCode(): number;
}
