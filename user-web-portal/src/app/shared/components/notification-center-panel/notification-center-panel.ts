import { Component, inject, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { NotificationCenterService } from '../../services/notification-center.service';
import { InboxNotification } from '../../types/notification.types';

@Component({
  selector: 'app-notification-center-panel',
  imports: [TranslatePipe],
  templateUrl: './notification-center-panel.html',
  styleUrl: './notification-center-panel.css',
})
export class NotificationCenterPanel {
  readonly center = inject(NotificationCenterService);
  private readonly translation = inject(TranslationService);
  readonly closeRequested = output<void>();

  open(notification: InboxNotification): void {
    this.center.open(notification);
    this.closeRequested.emit();
  }

  remove(event: Event, notification: InboxNotification): void {
    event.stopPropagation();
    this.center.remove(notification);
  }

  markAllRead(): void {
    this.center.markAllRead();
  }

  loadMore(): void {
    this.center.loadMore();
  }

  retry(): void {
    this.center.loadFirstPage();
  }

  relativeTime(date: string): string {
    const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const [value, unit] = abs < 60
      ? [Math.round(seconds), 'second']
      : abs < 3600
        ? [Math.round(seconds / 60), 'minute']
        : abs < 86400
          ? [Math.round(seconds / 3600), 'hour']
          : [Math.round(seconds / 86400), 'day'];
    return new Intl.RelativeTimeFormat(this.translation.currentLang(), { numeric: 'auto' }).format(value, unit as Intl.RelativeTimeFormatUnit);
  }

  typeLabel(type: InboxNotification['type']): string {
    return `notificationCenter.types.${type}`;
  }
}
