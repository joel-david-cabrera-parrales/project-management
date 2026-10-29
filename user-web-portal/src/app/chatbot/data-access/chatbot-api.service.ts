import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatbotConversation, ChatbotFlowSummary } from '../models/chatbot.models';

@Injectable({ providedIn: 'root' })
export class ChatbotApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/chatbot`;

  getFlows(): Observable<ChatbotFlowSummary[]> {
    return this.http.get<ChatbotFlowSummary[]>(`${this.endpoint}/flows`);
  }

  startConversation(flowId = 'task-assistant'): Observable<ChatbotConversation> {
    return this.http.post<ChatbotConversation>(`${this.endpoint}/conversations`, { flowId });
  }

  getConversation(conversationId: string): Observable<ChatbotConversation> {
    return this.http.get<ChatbotConversation>(`${this.endpoint}/conversations/${conversationId}`);
  }

  sendMessage(conversationId: string, message: string): Observable<ChatbotConversation> {
    return this.http.post<ChatbotConversation>(`${this.endpoint}/conversations/${conversationId}/messages`, { message });
  }

  resetConversation(conversationId: string): Observable<ChatbotConversation> {
    return this.http.post<ChatbotConversation>(`${this.endpoint}/conversations/${conversationId}/reset`, {});
  }
}
