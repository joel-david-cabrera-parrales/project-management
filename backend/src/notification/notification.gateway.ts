import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import type { Namespace, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Notification } from './entities/notification.entity';

type AuthenticatedSocket = Socket & {
  data: {
    userId?: number;
    tokenExp?: number;
    authExpiryTimer?: ReturnType<typeof setTimeout>;
  };
};

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.HOST_FRONTEND || 'http://localhost:4200',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private namespace: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserProfile)
    private readonly userRepository: Repository<UserProfile>,
  ) {}

  afterInit(namespace: Namespace): void {
    namespace.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = this.getToken(socket);
        if (!token) return next(new Error('Unauthorized'));

        const payload = await this.jwtService.verifyAsync<JwtPayload & { exp?: number }>(token);
        const user = await this.userRepository.findOne({ where: { code: payload.userCode } });
        if (!user || !user.isAvailable || user.isLoginLocked) return next(new Error('Unauthorized'));

        socket.data.userId = user.id;
        socket.data.tokenExp = payload.exp;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    if (!client.data.userId) {
      client.disconnect(true);
      return;
    }
    await client.join(this.userRoom(client.data.userId));
    if (client.data.tokenExp) {
      const remainingMs = client.data.tokenExp * 1000 - Date.now();
      client.data.authExpiryTimer = setTimeout(() => client.disconnect(true), Math.max(remainingMs, 0));
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    // Socket.IO automatically removes disconnected sockets from their rooms.
    if (client.data.authExpiryTimer) clearTimeout(client.data.authExpiryTimer);
  }

  emitNewNotification(userId: number, notification: Notification, unreadCount: number): void {
    this.emit(userId, 'notification:new', this.toPayload(notification));
    this.emitUnreadCount(userId, unreadCount);
  }

  emitRead(userId: number, notification: Notification, unreadCount: number): void {
    this.emit(userId, 'notification:read', {
      id: notification.id,
      read: notification.read,
      readAt: notification.readAt,
    });
    this.emitUnreadCount(userId, unreadCount);
  }

  emitReadAll(userId: number): void {
    this.emit(userId, 'notification:read-all', { read: true });
    this.emitUnreadCount(userId, 0);
  }

  emitDeleted(userId: number, id: number, unreadCount: number): void {
    this.emit(userId, 'notification:deleted', { id });
    this.emitUnreadCount(userId, unreadCount);
  }

  private emitUnreadCount(userId: number, count: number): void {
    this.emit(userId, 'notification:unread-count', { count });
  }

  private emit(userId: number, event: string, payload: unknown): void {
    this.namespace.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: number): string {
    return `user:${userId}`;
  }

  private getToken(socket: AuthenticatedSocket): string | undefined {
    const authToken = socket.handshake.auth?.token;
    const authorization = socket.handshake.headers.authorization;
    const value = typeof authToken === 'string' ? authToken : authorization;
    if (!value) return undefined;
    return value.startsWith('Bearer ') ? value.slice(7) : value;
  }

  private toPayload(notification: Notification) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
