import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ChatbotApiService } from './chatbot-api.service';

describe('ChatbotApiService', () => {
  let service: ChatbotApiService;
  let http: HttpTestingController;
  const endpoint = `${environment.apiUrl}/chatbot`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatbotApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads available flows and starts a conversation with the task assistant flow', () => {
    service.getFlows().subscribe((flows) => expect(flows[0].id).toBe('task-assistant'));
    http.expectOne(`${endpoint}/flows`).flush([{ id: 'task-assistant', name: 'Asistente de tareas' }]);

    service.startConversation().subscribe((conversation) => expect(conversation.id).toBe('conversation-id'));
    const request = http.expectOne(`${endpoint}/conversations`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ flowId: 'task-assistant' });
    request.flush({ id: 'conversation-id', flowId: 'task-assistant', history: [] });
  });

  it('restores a conversation and posts messages scoped to its id', () => {
    service.getConversation('conversation-id').subscribe((conversation) => expect(conversation.state).toBe('welcome'));
    const getRequest = http.expectOne(`${endpoint}/conversations/conversation-id`);
    expect(getRequest.request.method).toBe('GET');
    getRequest.flush({ id: 'conversation-id', flowId: 'task-assistant', state: 'welcome', history: [] });

    service.sendMessage('conversation-id', 'Ver mis tareas').subscribe((conversation) => {
      expect(conversation.history).toHaveLength(1);
    });
    const messageRequest = http.expectOne(`${endpoint}/conversations/conversation-id/messages`);
    expect(messageRequest.request.method).toBe('POST');
    expect(messageRequest.request.body).toEqual({ message: 'Ver mis tareas' });
    messageRequest.flush({ id: 'conversation-id', history: [{ sender: 'assistant', content: 'Tareas' }] });
  });

  it('resets a conversation using its own endpoint', () => {
    service.resetConversation('conversation-id').subscribe((conversation) => expect(conversation.state).toBe('welcome'));
    const request = http.expectOne(`${endpoint}/conversations/conversation-id/reset`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush({ id: 'conversation-id', state: 'welcome', history: [] });
  });
});
