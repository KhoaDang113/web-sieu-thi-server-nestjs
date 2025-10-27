import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CustomJwtService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || 'your-access-secret';
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  signAccessToken(userId: string, role?: string): string {
    return jwt.sign(
      { id: userId, type: 'access', role },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
      },
    );
  }

  signRefreshToken(userId: string): string {
    return jwt.sign({ id: userId, type: 'refresh' }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    });
  }

  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.accessTokenSecret);
    } catch (error) {
      console.log('error', error);
      throw new Error('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, this.refreshTokenSecret);
    } catch (error) {
      console.log('error', error);
      throw new Error('Invalid refresh token');
    }
  }
}
