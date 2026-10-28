import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskComment, Assignment } from '../../models/workspace.models';
import { DatePipe } from '@angular/common';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task-comment-card',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  templateUrl: './task-comment-card.html',
  styleUrl: './task-comment-card.css',
})
export class TaskCommentCard {
  private readonly workspaceState = inject(WorkspaceStateService);
  protected workspace = toSignal(this.workspaceState.workspace$);

  comment = input.required<TaskComment>();
  assignees = input<Assignment[]>([]);
  showReplyInput = signal(false);
  replyContent = signal('');

  reply = output<{ parentId: number; content: string }>();
  delete = output<string>();

  // Reply mention state
  protected showMentionDropdown = signal(false);
  protected mentionFilter = signal('');
  protected mentionPosition = signal({ x: 0, y: 0 });

  protected isTopLevel = computed(() => !this.comment().parentId);
  protected replyCount = computed(() => this.comment().replies?.length ?? 0);

  protected contentParts = computed(() => {
    const text = this.comment().content;
    const regex = /@(\p{L}+(?:\s\p{L}+)?)/gu;
    const parts: { text: string; isMention: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isMention: false });
      }
      parts.push({ text: match[0], isMention: true });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isMention: false });
    }
    return parts;
  });

  protected filteredMentions = computed(() => {
    const filter = this.mentionFilter().toLowerCase().trim();
    if (!filter) return this.assignees();
    return this.assignees().filter((a) => a.fullname.toLowerCase().includes(filter));
  });

  protected onReplyInput(value: string): void {
    this.replyContent.set(value);
    const inputEl = document.querySelector('.reply-input') as HTMLInputElement;
    if (!inputEl) return;
    const cursorPos = inputEl.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        const rect = inputEl.getBoundingClientRect();
        const approxChars = Math.min(afterAt.length, 15);
        const left = rect.left + 16 + approxChars * 8;
        this.mentionPosition.set({ x: Math.min(left, rect.right - 200), y: rect.bottom + 4 });
        this.mentionFilter.set(afterAt);
        this.showMentionDropdown.set(true);
        return;
      }
    }
    this.showMentionDropdown.set(false);
  }

  protected onSelectMention(member: Assignment, inputEl: HTMLInputElement): void {
    const value = this.replyContent();
    const cursorPos = inputEl.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    const beforeAt = beforeCursor.slice(0, lastAt);
    const newValue = beforeAt + '@' + member.fullname + ' ' + afterCursor;
    this.replyContent.set(newValue);
    this.showMentionDropdown.set(false);
    setTimeout(() => {
      inputEl.focus();
      const newPos = lastAt + member.fullname.length + 2;
      inputEl.setSelectionRange(newPos, newPos);
    });
  }

  protected toggleReply(): void {
    this.showReplyInput.update((v) => !v);
    this.replyContent.set('');
    this.showMentionDropdown.set(false);
  }

  protected onReplySubmit(): void {
    const content = this.replyContent().trim();
    if (!content) return;
    this.reply.emit({ parentId: this.comment().id, content });
    this.showReplyInput.set(false);
    this.replyContent.set('');
    this.showMentionDropdown.set(false);
  }

  protected onDelete(): void {
    this.delete.emit(this.comment().code);
  }
}
