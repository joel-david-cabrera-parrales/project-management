import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'shared-notification',
  standalone: true,
  imports: [NgFor, TranslatePipe],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
})
export class NotificationComponent {
  protected service = inject(NotificationService);

  remove(id: string): void {
    this.service.remove(id);
  }
}
