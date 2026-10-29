import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InboxNotification, InboxNotificationPage } from '../types/notification.types';

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/notifications`;

  list(page = 1, limit = 20): Observable<InboxNotificationPage> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<InboxNotificationPage>(this.endpoint, { params });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.endpoint}/unread-count`);
  }

  markRead(id: number): Observable<InboxNotification> {
    return this.http.patch<InboxNotification>(`${this.endpoint}/${id}/read`, {});
  }

  markAllRead(): Observable<{ affected: number }> {
    return this.http.patch<{ affected: number }>(`${this.endpoint}/read-all`, {});
  }

  remove(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.endpoint}/${id}`);
  }
}
