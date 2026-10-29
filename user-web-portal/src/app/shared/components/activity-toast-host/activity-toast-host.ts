import { Component, inject } from '@angular/core';
import { NotificationCenterService } from '../../services/notification-center.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ActivityToast } from '../../types/notification.types';

@Component({
  selector: 'app-activity-toast-host',
  imports: [TranslatePipe],
  templateUrl: './activity-toast-host.html',
  styleUrl: './activity-toast-host.css',
})
export class ActivityToastHost {
  readonly center = inject(NotificationCenterService);
  private readonly translation = inject(TranslationService);

  close(toast: ActivityToast): void {
    this.center.dismissToast(toast.id);
  }

  open(toast: ActivityToast): void {
    this.center.openToast(toast);
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
}
