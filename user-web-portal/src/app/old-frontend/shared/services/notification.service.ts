import { Injectable, signal } from '@angular/core';
import type { Notification, NotificationType, NotificationOptions } from '../types/notification.types';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private _counter = 0;

  private add(type: NotificationType, message: string, opts?: NotificationOptions): void {
    const id = `notif-${++this._counter}`;
    const duration = opts?.duration ?? 4000;
    const notification: Notification = {
      id,
      type,
      message,
      title: opts?.title,
      duration,
    };

    this._notifications.update((list) => [...list, notification]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), notification.duration);
    }
  }

  remove(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  success(message: string, opts?: NotificationOptions): void {
    this.add('success', message, opts);
  }

  error(message: string, opts?: NotificationOptions): void {
    this.add('error', message, opts);
  }

  warning(message: string, opts?: NotificationOptions): void {
    this.add('warning', message, opts);
  }

  info(message: string, opts?: NotificationOptions): void {
    this.add('info', message, opts);
  }
}
