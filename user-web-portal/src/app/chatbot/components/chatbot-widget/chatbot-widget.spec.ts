import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { ChatbotApiService } from '../../data-access/chatbot-api.service';
import { ChatbotConversation } from '../../models/chatbot.models';
import { StorageService } from '../../../shared/services/storage.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { ChatbotWidget } from './chatbot-widget';

function conversation(overrides: Partial<ChatbotConversation> = {}): ChatbotConversation {
  return {
    id: 'conversation-id',
    flowId: 'task-assistant',
    state: 'welcome',
    completed: false,
    input: { type: 'choice', required: true, options: ['Ver mis tareas', 'Crear una tarea'] },
    responses: ['¡Hola! Soy Lumi 😊'],
    history: [{ sender: 'assistant', content: '¡Hola! Soy Lumi 😊', timestamp: '2026-10-29T10:00:00.000Z' }],
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
    ...overrides,
  };
}

describe('ChatbotWidget', () => {
  let fixture: ComponentFixture<ChatbotWidget>;
  let component: ChatbotWidget;
  let api: {
    getFlows: ReturnType<typeof vi.fn>;
    startConversation: ReturnType<typeof vi.fn>;
    getConversation: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    resetConversation: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = {
      getFlows: vi.fn().mockReturnValue(of([{ id: 'task-assistant', name: 'Asistente de tareas' }])),
      startConversation: vi.fn().mockReturnValue(of(conversation())),
      getConversation: vi.fn(),
      sendMessage: vi.fn(),
      resetConversation: vi.fn(),
    };
    router = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ChatbotWidget],
      providers: [
        { provide: ChatbotApiService, useValue: api },
        { provide: StorageService, useValue: { getUserCode: () => 'user-code' } },
        { provide: Router, useValue: router },
        { provide: TranslationService, useValue: { translate: (key: string) => key } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotWidget);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts and renders an authenticated assistant conversation when opened', async () => {
    fixture.nativeElement.querySelector('.chatbot-launcher').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.startConversation).toHaveBeenCalledWith();
    expect(fixture.nativeElement.textContent).toContain('¡Hola! Soy Lumi');
    expect(fixture.nativeElement.querySelector('.chatbot-quick-replies')).toBeTruthy();
  });

  it('sends a selected flow option to the conversation endpoint', async () => {
    component.conversation.set(conversation());
    component.open.set(true);
    api.sendMessage.mockReturnValue(of(conversation({
      state: 'my-tasks',
      completed: true,
      input: null,
      history: [
        ...conversation().history,
        { sender: 'user', content: 'Ver mis tareas', timestamp: '2026-10-29T10:01:00.000Z' },
        { sender: 'assistant', content: 'No tienes tareas abiertas asignadas.', timestamp: '2026-10-29T10:01:01.000Z' },
      ],
    })));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.chatbot-quick-replies button').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.sendMessage).toHaveBeenCalledWith('conversation-id', 'Ver mis tareas');
    expect(fixture.nativeElement.textContent).toContain('No tienes tareas abiertas asignadas.');
  });

  it('renders task cards and navigates to the selected task', () => {
    component.conversation.set(conversation({
      input: null,
      history: [{
        sender: 'assistant',
        content: 'Estas son tus tareas:',
        timestamp: '2026-10-29T10:00:00.000Z',
        tasks: [{
          taskCode: 'task-code',
          title: 'Preparar la demo',
          completed: false,
          workspaceCode: 'workspace-code',
          workspaceName: 'Producto',
          boardCode: 'board-code',
          boardName: 'Frontend',
          taskListName: 'Pendiente',
          dateEnd: '2026-10-30',
        }],
      }],
    }));
    component.open.set(true);
    fixture.detectChanges();

    const taskCard = fixture.nativeElement.querySelector('.chatbot-task-card') as HTMLButtonElement;
    expect(taskCard.textContent).toContain('Preparar la demo');
    taskCard.click();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/workspace', 'workspace-code', 'board', 'board-code'],
      { queryParams: { task: 'task-code' } },
    );
  });
});
