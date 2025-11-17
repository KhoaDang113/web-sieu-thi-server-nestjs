import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomJwtService } from '../auth/customJwt.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer() io: Server;

  constructor(
    private readonly customJwtService: CustomJwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Lấy token từ auth hoặc query
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(
          `Socket ${client.id} connection rejected: No token provided`,
        );
        client.disconnect(true);
        return;
      }

      // Xác thực JWT
      const payload = this.customJwtService.verifyAccessToken(token) as {
        id: string;
        type: string;
        role?: string;
      };

      const userId = payload.id;

      if (!userId) {
        this.logger.warn(
          `Socket ${client.id} connection rejected: Invalid token payload`,
        );
        client.disconnect(true);
        return;
      }

      // Lưu userId và role vào socket data để dùng sau
      (client.data as { userId: string; role?: string; type?: string }).userId =
        userId;
      (client.data as { userId: string; role?: string; type?: string }).role =
        payload.role;
      (client.data as { userId: string; role?: string; type?: string }).type =
        payload.type;

      await client.join(`user:${userId}`);
      this.logger.log(
        `Socket ${client.id} authenticated and joined user:${userId}`,
      );
      if (payload.role === 'staff' || payload.type === 'staff') {
        await client.join(`staff:${userId}`);
        await client.join('all-staff'); // Join vào room chung cho tất cả staff
        this.logger.log(
          `Socket ${client.id} also joined staff:${userId} and all-staff room`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Socket ${client.id} authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client.data as { userId?: string; role?: string }).userId;
    const role = (client.data as { userId?: string; role?: string }).role;
    if (userId) {
      await client.leave(`user:${userId}`);
      this.logger.log(`Socket ${client.id} disconnected from user:${userId}`);
      if (role === 'staff') {
        await client.leave(`staff:${userId}`);
        await client.leave('all-staff');
        this.logger.log(
          `Socket ${client.id} disconnected from all staff rooms`,
        );
      }
    }
  }

  emitToUser(userId: string, event: string, payload: any) {
    this.io.to(`user:${userId}`).emit(event, payload);
    this.logger.debug(`Emitted '${event}' to user:${userId}`);
  }

  emitToRoom(roomId: string, event: string, payload: any) {
    this.io.to(roomId).emit(event, payload);
    this.logger.debug(`Emitted '${event}' to room:${roomId}`);
  }

  // Emit to all staff members
  emitToAllStaff(event: string, payload: any) {
    this.io.to('all-staff').emit(event, payload);
    this.logger.debug(`Emitted '${event}' to all-staff`);
  }

  // Emit to all staff except one (useful when a staff updates and we want to notify others)
  emitToAllStaffExcept(excludeStaffId: string, event: string, payload: any) {
    // Get all sockets in all-staff room and filter out the excluded staff
    const staffRoom = this.io.sockets.adapter.rooms.get('all-staff');
    if (staffRoom) {
      for (const socketId of staffRoom) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          const socketUserId = (socket.data as { userId?: string }).userId;
          if (socketUserId !== excludeStaffId) {
            socket.emit(event, payload);
          }
        }
      }
      this.logger.debug(
        `Emitted '${event}' to all-staff except ${excludeStaffId}`,
      );
    }
  }
}
