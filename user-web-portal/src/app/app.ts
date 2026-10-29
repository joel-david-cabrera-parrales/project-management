import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { ActivityToastHost } from './shared/components/activity-toast-host/activity-toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent, ActivityToastHost],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('user-web-portal');
}
