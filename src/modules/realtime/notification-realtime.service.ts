import { RealtimeGateway } from './realtime.gateway';
import { Injectable } from '@nestjs/common';
import { NotificationPayload } from './interfaces/notification-realtime.interface';

@Injectable()
export class NotificationRealtimeService {
  constructor(private readonly rt: RealtimeGateway) {}

  // Gửi thông báo realtime cho 1 user cụ thể
  notifyUser(userId: string, data: NotificationPayload) {
    this.rt.emitToUser(userId, 'notification:new', data);
  }

  // Gửi thông báo cho nhiều users
  notifyMultipleUsers(userIds: string[], data: NotificationPayload) {
    for (const userId of userIds) {
      this.rt.emitToUser(userId, 'notification:new', data);
    }
  }

  // Thông báo khi có reply comment (gửi cho user được reply)
  notifyCommentReply(userId: string, data: NotificationPayload) {
    this.rt.emitToUser(userId, 'notification:comment-reply', data);
  }

  // Thông báo cập nhật số lượng unread
  notifyUnreadCountUpdate(userId: string, count: number) {
    this.rt.emitToUser(userId, 'notification:unread-count', { count });
  }
}
