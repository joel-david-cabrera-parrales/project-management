import { Component, effect, inject, computed, output, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Task, Label, TaskAttachment, TaskComment, Assignment } from '../../models/workspace.models';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TaskService } from '../../services/task-service';
import { LabelService } from '../../services/label-service';
import { AttachmentService } from '../../services/attachment-service';
import { CommentService } from '../../services/comment-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AssigneePicker } from '../assignee-picker/assignee-picker';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { TaskAttachmentCard } from '../task-attachment-card/task-attachment-card';
import { TaskCommentCard } from '../task-comment-card/task-comment-card';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NotificationService } from '../../../shared/services/notification.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task-detail',
  imports: [ReactiveFormsModule, FormsModule, AssigneePicker, TaskAttachmentCard, TaskCommentCard, DatePipe, DecimalPipe, ModalComponent, TranslatePipe],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.css',
})
export class TaskDetail {
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly taskService = inject(TaskService);
  private readonly labelService = inject(LabelService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly commentService = inject(CommentService);
  private readonly notification = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  task = toSignal(this.workspaceState.selectedTask$);
  protected workspace = toSignal(this.workspaceState.workspace$);
  protected saving = signal(false);
  close = output<void>();

  protected deleteAttachmentTarget = signal<TaskAttachment | null>(null);
  protected deleteCommentTarget = signal<string | null>(null);
  protected deleting = signal(false);
  saved = output<Task>();

  private readonly fb = inject(FormBuilder);

  taskForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    dateInit: [''],
    dateEnd: [''],
  }, { validators: dateRangeValidator('dateInit', 'dateEnd') });

  protected availableLabels = signal<Label[]>([]);
  protected labelFilter = signal('');
  protected showLabelDropdown = signal(false);
  protected labelDropdownPosition = signal({ x: 0, y: 0 });

  protected filteredLabels = computed(() => {
    const filter = this.labelFilter().toLowerCase().trim();
    if (!filter) return this.availableLabels();
    return this.availableLabels().filter((l) =>
      l.name.toLowerCase().includes(filter),
    );
  });

  isAssigned(labelId: number): boolean {
    return this.task()?.labels?.some((l) => l.id === labelId) ?? false;
  }

  protected showCreateOption = computed(() => {
    const filter = this.labelFilter().trim();
    if (!filter) return false;
    return !this.availableLabels().some(
      (l) => l.name.toLowerCase() === filter.toLowerCase(),
    );
  });

  // Attachment state
  protected showAttachments = signal(false);
  protected attachmentsLoading = signal(false);
  protected attachments = signal<TaskAttachment[]>([]);
  protected uploadDragOver = signal(false);
  protected uploadingFiles = signal<{ name: string; progress: number }[]>([]);
  protected previewAttachment = signal<TaskAttachment | null>(null);
  protected previewLoading = signal(false);

  // Comment state
  protected showComments = signal(false);
  protected commentsLoading = signal(false);
  protected comments = signal<TaskComment[]>([]);
  protected newCommentContent = signal('');
  protected showMentionDropdown = signal(false);
  protected mentionFilter = signal('');
  protected mentionPosition = signal({ x: 0, y: 0 });

  private readonly allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024;



  // File type helpers
  protected fileExt(name: string): string {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
  }

  protected isImageFile(name: string): boolean {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(this.fileExt(name));
  }

  protected fileTypeColor(name: string): string {
    const ext = this.fileExt(name);
    if (['pdf'].includes(ext)) return '#ef4444';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '#3B82F6';
    if (['doc', 'docx'].includes(ext)) return '#6366F1';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#10B981';
    if (['ppt', 'pptx'].includes(ext)) return '#F59E0B';
    if (['zip', 'rar', 'gz', '7z'].includes(ext)) return '#8B5CF6';
    return '#6B7280';
  }

  protected formattedSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected fileCount = computed(() => this.attachments().length);

  constructor() {
    effect(() => {
      const t = this.task();
      const ws = this.workspaceState.workspaceValue;
      if (t && ws?.id) {
        this.taskForm.patchValue({
          title: t.title,
          description: t.description,
          dateInit: t.dateInit ? t.dateInit.substring(0, 10) : '',
          dateEnd: t.dateEnd ? t.dateEnd.substring(0, 10) : '',
        });
        this.labelService.getWorkspaceLabels(ws.id).subscribe((labels) => {
          this.availableLabels.set(labels ?? []);
        });
        this.attachmentsLoading.set(true);
        this.attachmentService.getTaskAttachments(t.code).subscribe((atts) => {
          this.attachments.set(atts);
          this.attachmentsLoading.set(false);
        });
        this.commentsLoading.set(true);
        this.commentService.getTaskComments(t.code).subscribe((comms) => {
          this.comments.set(comms);
          this.commentsLoading.set(false);
        });
      } else {
        this.taskForm.reset();
        this.attachments.set([]);
        this.comments.set([]);
      }
    });
  }

  toggleLabelDropdown(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.labelDropdownPosition.set({ x: rect.left, y: rect.bottom + 6 });
    this.labelFilter.set('');
    this.showLabelDropdown.update((v) => !v);
  }

  closeLabelDropdown(): void {
    this.showLabelDropdown.set(false);
  }

  onAssignLabel(label: Label): void {
    const t = this.task();
    if (!t) return;
    this.showLabelDropdown.set(false);
    this.taskService.addLabelToTask(t.id, label.id).subscribe();
  }

  onRemoveLabel(label: Label): void {
    const t = this.task();
    if (!t) return;
    this.taskService.removeLabelFromTask(t.id, label.id).subscribe();
  }

  onLabelFilterInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.labelFilter.set(input.value);
  }

  onCreateAndAssign(): void {
    const t = this.task();
    const ws = this.workspaceState.workspaceValue;
    const name = this.labelFilter().trim();
    if (!t || !ws?.id || !name) return;

    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
    const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

    this.labelService.create({ name, color: colors[colorIndex], workspaceCode: ws.id }).subscribe((label) => {
      if (label) {
        this.availableLabels.update((prev) => [...prev, label]);
        this.taskService.addLabelToTask(t.id, label.id).subscribe();
      }
    });
  }

  // Attachment handlers
  protected onUploadClick(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    input.onchange = () => {
      if (input.files) this.handleFiles(input.files);
    };
    input.click();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(false);
    if (event.dataTransfer?.files) {
      this.handleFiles(event.dataTransfer.files);
    }
  }

  private handleFiles(files: FileList): void {
    const task = this.task();
    if (!task) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!this.allowedTypes.includes(file.type)) {
        this.notification.warning(`"${file.name}" no es un tipo de archivo permitido`);
        continue;
      }
      if (file.size > this.maxFileSize) {
        this.notification.warning(`"${file.name}" excede el límite de 10MB`);
        continue;
      }
      const entry = { name: file.name, progress: 0 };
      this.uploadingFiles.update((prev) => [...prev, entry]);
      this.realUpload(entry, file, task.code);
    }
  }

  private realUpload(entry: { name: string; progress: number }, file: File, taskCode: string): void {
    const { progress, result } = this.attachmentService.uploadAttachment(taskCode, file);
    const progSub = progress.subscribe((p) => {
      entry.progress = p;
      this.uploadingFiles.set([...this.uploadingFiles()]);
    });
    const resSub = result.subscribe((att) => {
      this.uploadingFiles.update((prev) => prev.filter((e) => e.name !== entry.name));
      if (att) {
        this.attachments.update((prev) => [att, ...prev]);
      }
    });
    this.destroyRef.onDestroy(() => {
      progSub.unsubscribe();
      resSub.unsubscribe();
    });
  }

  protected onPreviewAttachment(att: TaskAttachment): void {
    this.previewAttachment.set(att);
    this.previewLoading.set(true);
    if (this.isImageFile(att.fileName)) {
      const img = new Image();
      img.onload = () => this.previewLoading.set(false);
      img.onerror = () => this.previewLoading.set(false);
      img.src = att.url;
    } else {
      setTimeout(() => this.previewLoading.set(false), 600);
    }
  }

  protected closePreview(): void {
    this.previewAttachment.set(null);
    this.previewLoading.set(false);
  }

  protected onDownloadAttachment(att: TaskAttachment): void {
    window.open(att.url, '_blank');
  }

  protected openDeleteAttachmentConfirm(att: TaskAttachment): void {
    this.deleteAttachmentTarget.set(att);
  }

  protected closeDeleteAttachmentConfirm(): void {
    this.deleteAttachmentTarget.set(null);
  }

  protected onConfirmDeleteAttachment(): void {
    const att = this.deleteAttachmentTarget();
    if (!att) return;
    this.deleting.set(true);
    this.attachmentService.deleteAttachment(att.code).subscribe((deleted) => {
      this.deleting.set(false);
      if (deleted) {
        this.attachments.update((prev) => prev.filter((a) => a.code !== att.code));
      }
      this.deleteAttachmentTarget.set(null);
    });
  }

  // Comment handlers
  protected commentCount = computed(() => {
    const c = this.comments();
    return c.reduce((acc, cm) => acc + 1 + (cm.replies?.length ?? 0), 0);
  });

  protected filteredMentions = computed(() => {
    const assignees = this.task()?.assignees ?? [];
    const filter = this.mentionFilter().toLowerCase().trim();
    if (!filter) return assignees;
    return assignees.filter((a) => a.fullname.toLowerCase().includes(filter));
  });

  protected onCommentInput(value: string): void {
    this.newCommentContent.set(value);
    const cursorPos = (document.activeElement as HTMLInputElement)?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        const input = document.querySelector('.comment-input') as HTMLInputElement;
        if (input) {
          const rect = input.getBoundingClientRect();
          const approxChars = Math.min(afterAt.length, 15);
          const left = rect.left + 16 + approxChars * 8;
          this.mentionPosition.set({ x: Math.min(left, rect.right - 200), y: rect.bottom + 4 });
        }
        this.mentionFilter.set(afterAt);
        this.showMentionDropdown.set(true);
        return;
      }
    }
    this.showMentionDropdown.set(false);
  }

  protected onSelectMention(member: Assignment, inputEl: HTMLInputElement): void {
    const value = this.newCommentContent();
    const cursorPos = inputEl.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    const beforeAt = beforeCursor.slice(0, lastAt);
    const newValue = beforeAt + '@' + member.fullname + ' ' + afterCursor;
    this.newCommentContent.set(newValue);
    this.showMentionDropdown.set(false);
    setTimeout(() => {
      inputEl.focus();
      const newPos = lastAt + member.fullname.length + 2;
      inputEl.setSelectionRange(newPos, newPos);
    });
  }

  private parseMentions(content: string): number[] {
    const assignees = this.task()?.assignees ?? [];
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const ids: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(content)) !== null) {
      const name = match[1].toLowerCase().trim();
      const found = assignees.find((a) => a.fullname.toLowerCase() === name);
      if (found && !ids.includes(found.workspaceMemberId)) {
        ids.push(found.workspaceMemberId);
      }
    }
    return ids;
  }

  protected onSubmitComment(): void {
    const task = this.task();
    const content = this.newCommentContent().trim();
    if (!task || !content) return;
    const mentions = this.parseMentions(content);
    this.commentService.createComment(task.code, content, undefined, mentions).subscribe((comment) => {
      if (comment) {
        this.comments.update((prev) => [...prev, comment]);
        this.newCommentContent.set('');
        this.workspaceState.incrementTaskComments(task.code);
      }
    });
  }

  protected onReplyToComment(event: { parentId: number; content: string }): void {
    const task = this.task();
    if (!task) return;
    const mentions = this.parseMentions(event.content);
    this.commentService.createComment(task.code, event.content, event.parentId, mentions).subscribe((reply) => {
      if (reply) {
        this.comments.update((prev) =>
          prev.map((c) => {
            if (c.id === event.parentId) {
              return { ...c, replies: [...(c.replies ?? []), reply] };
            }
            return c;
          }),
        );
        this.workspaceState.incrementTaskComments(task.code);
      }
    });
  }

  protected openDeleteCommentConfirm(code: string): void {
    this.deleteCommentTarget.set(code);
  }

  protected closeDeleteCommentConfirm(): void {
    this.deleteCommentTarget.set(null);
  }

  protected onConfirmDeleteComment(): void {
    const code = this.deleteCommentTarget();
    if (!code) return;
    const task = this.task();
    this.deleting.set(true);
    this.commentService.deleteComment(code).subscribe((deleted) => {
      this.deleting.set(false);
      if (deleted) {
        this.comments.update((prev) => {
          const filtered = prev.filter((c) => c.code !== code);
          return filtered.map((c) => ({
            ...c,
            replies: c.replies?.filter((r) => r.code !== code),
          }));
        });
        if (task) this.workspaceState.incrementTaskComments(task.code, -1);
      }
      this.deleteCommentTarget.set(null);
    });
  }

  protected onSave(): void {
    if (this.taskForm.invalid || this.saving()) return;
    const currentTask = this.task();
    if (!currentTask) return;
    this.saving.set(true);
    this.taskService
      .updateTask(currentTask.id, {
        title: this.taskForm.value.title!,
        description: this.taskForm.value.description!,
        dateInit: this.taskForm.value.dateInit ? new Date(this.taskForm.value.dateInit).toISOString() : undefined,
        dateEnd: this.taskForm.value.dateEnd ? new Date(this.taskForm.value.dateEnd).toISOString() : undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.workspaceState.refreshWorkspace();
          this.saved.emit({
            ...currentTask,
            title: this.taskForm.value.title!,
            description: this.taskForm.value.description!,
            dateInit: this.taskForm.value.dateInit || undefined,
            dateEnd: this.taskForm.value.dateEnd || undefined,
          });
          this.workspaceState.closeTaskDetailModal();
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  onClose(): void {
    this.close.emit();
    this.workspaceState.closeTaskDetailModal();
  }
}
