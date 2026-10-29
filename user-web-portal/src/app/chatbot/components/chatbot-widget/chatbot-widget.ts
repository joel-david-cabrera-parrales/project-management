import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { computed } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { StorageService } from '../../../shared/services/storage.service';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';
import { ChatbotApiService } from '../../data-access/chatbot-api.service';
import { ChatbotConversation, ChatbotListItem, ChatbotMessage, ChatbotTaskCard } from '../../models/chatbot.models';

@Component({
  selector: 'app-chatbot-widget',
  imports: [DatePipe, TranslatePipe, TooltipDirective],
  templateUrl: './chatbot-widget.html',
  styleUrl: './chatbot-widget.css',
})
export class ChatbotWidget {
  private readonly api = inject(ChatbotApiService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly textInput = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');
  private readonly messagesViewport = viewChild<ElementRef<HTMLDivElement>>('messagesViewport');

  readonly open = signal(false);
  readonly conversation = signal<ChatbotConversation | null>(null);
  readonly quickOptions = computed(() => this.conversation()?.input?.options ?? []);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly restoring = signal(false);

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    if (!this.conversation() && !this.busy()) this.restoreOrStart();
  }

  close(): void {
    this.open.set(false);
  }

  sendDraft(): void {
    const message = this.draft().trim();
    if (!message) return;
    this.send(message);
  }

  sendQuickReply(value: string): void {
    this.send(value);
  }

  openTask(task: ChatbotTaskCard): void {
    this.close();
    void this.router.navigate(['/workspace', task.workspaceCode, 'board', task.boardCode], {
      queryParams: { task: task.taskCode },
    });
  }

  selectListItem(item: ChatbotListItem): void {
    this.sendQuickReply(item.value);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDraft();
    }
  }

  startNewConversation(): void {
    if (this.busy()) return;
    const userCode = this.storage.getUserCode();
    this.busy.set(true);
    this.errorKey.set(null);
    this.api.startConversation().pipe(
      finalize(() => this.busy.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (conversation) => {
        this.conversation.set(conversation);
        if (userCode) this.saveConversationId(userCode, conversation.id);
        this.scrollToLatest();
      },
      error: () => this.errorKey.set('chatbot.errors.start'),
    });
  }

  resetConversation(): void {
    const conversation = this.conversation();
    if (!conversation || this.busy()) return;
    this.busy.set(true);
    this.errorKey.set(null);
    this.api.resetConversation(conversation.id).pipe(
      finalize(() => this.busy.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (reset) => {
        this.conversation.set(reset);
        this.draft.set('');
        this.scrollToLatest();
      },
      error: () => this.errorKey.set('chatbot.errors.reset'),
    });
  }

  retry(): void {
    this.errorKey.set(null);
    this.restoreOrStart();
  }

  trackMessage(index: number, message: ChatbotMessage): string {
    return `${message.timestamp}-${message.sender}-${index}`;
  }

  private restoreOrStart(): void {
    if (this.busy()) return;
    const userCode = this.storage.getUserCode();
    const savedId = userCode ? this.readConversationId(userCode) : null;
    if (!savedId) {
      this.startNewConversation();
      return;
    }

    this.restoring.set(true);
    this.busy.set(true);
    this.errorKey.set(null);
    this.api.getConversation(savedId).pipe(
      finalize(() => {
        this.restoring.set(false);
        this.busy.set(false);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (conversation) => {
        this.conversation.set(conversation);
        this.scrollToLatest();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 404 && userCode) {
          this.busy.set(false);
          this.restoring.set(false);
          this.removeConversationId(userCode);
          this.startNewConversation();
        } else {
          this.errorKey.set('chatbot.errors.load');
        }
      },
    });
  }

  private send(message: string): void {
    const conversation = this.conversation();
    if (!conversation || conversation.completed || this.busy()) return;
    this.busy.set(true);
    this.errorKey.set(null);
    this.api.sendMessage(conversation.id, message).pipe(
      finalize(() => this.busy.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (updated) => {
        this.conversation.set(updated);
        this.draft.set('');
        this.scrollToLatest();
        setTimeout(() => this.textInput()?.nativeElement.focus(), 0);
      },
      error: (error: HttpErrorResponse) => {
        this.errorKey.set(error.status === 409 ? 'chatbot.errors.completed' : 'chatbot.errors.message');
        this.refreshConversation(conversation.id);
      },
    });
  }

  private refreshConversation(conversationId: string): void {
    this.api.getConversation(conversationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (conversation) => this.conversation.set(conversation),
      error: () => undefined,
    });
  }

  private readConversationId(userCode: string): string | null {
    try {
      return sessionStorage.getItem(this.storageKey(userCode));
    } catch {
      return null;
    }
  }

  private saveConversationId(userCode: string, id: string): void {
    try {
      sessionStorage.setItem(this.storageKey(userCode), id);
    } catch {
      // The conversation remains usable for the current page even when storage is disabled.
    }
  }

  private removeConversationId(userCode: string): void {
    try {
      sessionStorage.removeItem(this.storageKey(userCode));
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  private storageKey(userCode: string): string {
    return `task-chatbot-conversation:${userCode}`;
  }

  private scrollToLatest(): void {
    setTimeout(() => {
      const viewport = this.messagesViewport()?.nativeElement;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }
}
