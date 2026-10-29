import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Socket } from 'socket.io-client';
import { finalize, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';
import { NotificationApiService } from './notification-api.service';
import { ActivityToast, InboxNotification } from '../types/notification.types';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly api = inject(NotificationApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private socket: Socket | null = null;
  private started = false;
  private currentPage = 1;
  private totalPages = 1;
  private recoveringSocketAuth = false;
  private readonly toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly notifications = signal<InboxNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly activityToasts = signal<ActivityToast[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly loadError = signal(false);
  readonly connected = signal(false);
  readonly hasMore = computed(() => this.currentPage < this.totalPages);

  start(): void {
    if (this.started) return;
    const token = this.storage.getToken();
    if (!token || this.storage.isTokenExpired()) return;

    this.started = true;
    this.loadFirstPage();

    void this.connectSocket(token);
  }

  private async connectSocket(token: string): Promise<void> {
    const { io } = await import('socket.io-client');
    if (!this.started || this.storage.getToken() !== token) return;

    const socketBaseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
    const socket = io(`${socketBaseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      // REST remains the source of truth after initial connection and reconnects.
      this.loadFirstPage();
    });
    socket.on('disconnect', () => this.connected.set(false));
    socket.on('connect_error', () => this.refreshSocketToken(socket));
    socket.on('notification:new', (notification: InboxNotification) => this.onNewNotification(notification));
    socket.on('notification:unread-count', ({ count }: { count: number }) => this.unreadCount.set(count));
    socket.on('notification:read', (event: { id: number; read: boolean; readAt?: string }) => {
      this.notifications.update((items) => items.map((item) => item.id === event.id
        ? { ...item, read: event.read, readAt: event.readAt ?? item.readAt }
        : item));
    });
    socket.on('notification:read-all', () => {
      const readAt = new Date().toISOString();
      this.notifications.update((items) => items.map((item) => ({ ...item, read: true, readAt })));
    });
    socket.on('notification:deleted', ({ id }: { id: number }) => {
      this.notifications.update((items) => items.filter((item) => item.id !== id));
    });
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.started = false;
    for (const timer of this.toastTimers.values()) clearTimeout(timer);
    this.toastTimers.clear();
    this.activityToasts.set([]);
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  loadFirstPage(): void {
    this.loading.set(true);
    this.loadError.set(false);
    forkJoin({
      page: this.api.list(1),
      unread: this.api.unreadCount(),
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: ({ page, unread }) => {
        this.currentPage = page.page;
        this.totalPages = page.totalPages;
        this.notifications.set(page.items);
        this.unreadCount.set(unread.count);
      },
      error: () => this.loadError.set(true),
    });
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    const nextPage = this.currentPage + 1;
    this.loadingMore.set(true);
    this.api.list(nextPage).pipe(finalize(() => this.loadingMore.set(false))).subscribe({
      next: (page) => {
        this.currentPage = page.page;
        this.totalPages = page.totalPages;
        this.notifications.update((items) => this.mergeNotifications(items, page.items));
      },
    });
  }

  markRead(notification: InboxNotification): void {
    if (notification.read) return;
    this.api.markRead(notification.id).subscribe({
      next: (updated) => this.notifications.update((items) => items.map((item) => item.id === updated.id ? updated : item)),
    });
  }

  markAllRead(): void {
    if (this.unreadCount() === 0) return;
    this.api.markAllRead().subscribe({
      next: () => {
        const readAt = new Date().toISOString();
        this.notifications.update((items) => items.map((item) => ({ ...item, read: true, readAt })));
    this.unreadCount.set(0);
    this.loadError.set(false);
      },
    });
  }

  remove(notification: InboxNotification): void {
    this.api.remove(notification.id).subscribe({
      next: () => {
        this.notifications.update((items) => items.filter((item) => item.id !== notification.id));
        if (!notification.read) this.unreadCount.update((count) => Math.max(0, count - 1));
      },
    });
  }

  open(notification: InboxNotification): void {
    this.markRead(notification);
    const data = notification.data;
    if (data?.invitationCode) {
      void this.router.navigate(['/invite', data.invitationCode]);
      return;
    }
    if (!data?.workspaceCode) return;
    if (notification.type === 'member_removed') {
      void this.router.navigate(['/workspace']);
      return;
    }
    if (data.taskCode) {
      const commands = data.boardCode
        ? ['/workspace', data.workspaceCode, 'board', data.boardCode]
        : ['/workspace', data.workspaceCode, 'board'];
      void this.router.navigate(commands, { queryParams: { task: data.taskCode, comment: data.commentCode ?? null } });
      return;
    }
    if (data.boardCode) {
      void this.router.navigate(['/workspace', data.workspaceCode, 'board', data.boardCode]);
      return;
    }
    void this.router.navigate(['/workspace', data.workspaceCode]);
  }

  dismissToast(id: number): void {
    const timer = this.toastTimers.get(id);
    if (timer) clearTimeout(timer);
    this.toastTimers.delete(id);
    this.activityToasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  openToast(toast: ActivityToast): void {
    this.open(toast.notification);
    this.dismissToast(toast.id);
  }

  private onNewNotification(notification: InboxNotification): void {
    const isKnown = this.notifications().some((item) => item.id === notification.id);
    this.notifications.update((items) => this.mergeNotifications([notification, ...items], []));
    if (!isKnown) this.showToast(notification);
  }

  private showToast(notification: InboxNotification): void {
    const toast: ActivityToast = { id: notification.id, notification };
    this.activityToasts.update((toasts) => [toast, ...toasts].slice(0, 3));
    const timer = setTimeout(() => this.dismissToast(toast.id), 8000);
    this.toastTimers.set(toast.id, timer);
  }

  private mergeNotifications(current: InboxNotification[], incoming: InboxNotification[]): InboxNotification[] {
    const byId = new Map<number, InboxNotification>();
    for (const item of [...current, ...incoming]) byId.set(item.id, item);
    return [...byId.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private refreshSocketToken(socket: Socket): void {
    const token = this.storage.getToken();
    const socketToken = typeof socket.auth === 'object' && socket.auth !== null
      ? (socket.auth as { token?: string }).token
      : undefined;
    if (token && token !== socketToken) {
      socket.auth = { token };
      return;
    }
    // If the access token expired while the page stayed open, an authenticated REST
    // call lets the existing auth interceptor refresh it before Socket.IO reconnects.
    if (!this.storage.isTokenExpired() || this.recoveringSocketAuth) return;
    this.recoveringSocketAuth = true;
    this.api.unreadCount().pipe(finalize(() => this.recoveringSocketAuth = false)).subscribe({
      next: () => {
        const refreshedToken = this.storage.getToken();
        if (refreshedToken) socket.auth = { token: refreshedToken };
      },
      error: () => socket.disconnect(),
    });
  }
}
