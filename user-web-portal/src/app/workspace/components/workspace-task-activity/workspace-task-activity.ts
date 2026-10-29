import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceTaskActivityApiService } from '../../data-access/workspace-task-activity-api.service';
import { WorkspaceDetailMember, WorkspaceTaskAssignee, WorkspaceTaskAttachment, WorkspaceTaskComment } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { WorkspaceAvatar } from '../workspace-avatar/workspace-avatar';
import { WorkspaceConfirmDialog } from '../workspace-confirm-dialog/workspace-confirm-dialog';
import { TooltipDirective } from '../../../shared/directives/tooltip.directive';

export const ALLOWED_TASK_FILE_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
export const MAX_TASK_FILE_SIZE = 10 * 1024 * 1024;

export interface CommentContentPart {
  text: string;
  isMention: boolean;
}

@Component({
  selector: 'app-workspace-task-activity',
  imports: [DatePipe, DecimalPipe, TranslatePipe, WorkspaceAvatar, WorkspaceConfirmDialog, TooltipDirective],
  templateUrl: './workspace-task-activity.html',
  styleUrl: './workspace-task-activity.css',
})
export class WorkspaceTaskActivity {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceTaskActivityApiService);
  private readonly detailStore = inject(WorkspaceDetailStore);
  private readonly thumbnailCache = new Map<string, string>();
  private previewObjectUrl: string | null = null;

  readonly taskCode = input.required<string>();
  readonly assignees = input<WorkspaceTaskAssignee[]>([]);
  readonly attachments = signal<WorkspaceTaskAttachment[]>([]);
  readonly thumbnails = signal<Record<string, string>>({});
  readonly comments = signal<WorkspaceTaskComment[]>([]);
  readonly loadingAttachments = signal(true);
  readonly loadingComments = signal(true);
  readonly uploading = signal(false);
  readonly uploadDragOver = signal(false);
  readonly uploads = signal<{ id: number; name: string; progress: number }[]>([]);
  readonly sendingComment = signal(false);
  readonly error = signal(false);
  readonly commentText = signal('');
  readonly replyTo = signal<number | null>(null);
  readonly replyText = signal('');
  readonly attachmentToDelete = signal<WorkspaceTaskAttachment | null>(null);
  readonly commentToDelete = signal<WorkspaceTaskComment | null>(null);
  readonly deleting = signal(false);

  // Preview state
  readonly previewAttachment = signal<WorkspaceTaskAttachment | null>(null);
  readonly previewImageUrl = signal<string | null>(null);
  readonly previewLoading = signal(false);

  // Mention state
  readonly mentionTarget = signal<'comment' | 'reply' | null>(null);
  readonly mentionFilter = signal('');

  readonly currentMemberId = computed(() => this.detailStore.workspace()?.workspaceMemberId ?? null);
  readonly canComment = computed(() => this.detailStore.isActive() && this.detailStore.workspace()?.roleMember !== 'viewer');
  readonly canManageAttachments = computed(() => this.detailStore.isActive() && ['owner', 'member'].includes(this.detailStore.workspace()?.roleMember ?? ''));

  readonly mentionCandidates = computed<WorkspaceDetailMember[]>(() => {
    const workspaceMembers = this.detailStore.workspace()?.members ?? [];
    if (workspaceMembers.length) return workspaceMembers;
    return this.assignees().map((a) => ({
      workspaceMemberId: a.workspaceMemberId,
      fullname: a.fullname,
      roleMember: 'member',
      email: a.email,
      photo: a.photo,
      initials: a.initials,
      avatarColor: a.avatarColor,
    }));
  });

  readonly filteredMentions = computed(() => {
    const filter = this.mentionFilter().toLowerCase().trim();
    const candidates = this.mentionCandidates();
    if (!filter) return candidates;
    return candidates.filter((member) => member.fullname.toLowerCase().includes(filter));
  });

  constructor() {
    let loadedTaskCode = '';
    effect(() => {
      const code = this.taskCode();
      if (!code || code === loadedTaskCode) return;
      loadedTaskCode = code;
      untracked(() => this.reload());
    });

    this.destroyRef.onDestroy(() => {
      this.clearThumbnails();
      this.clearPreviewUrl();
    });
  }

  reload(): void {
    this.loadAttachments();
    this.loadComments();
  }

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = '';
    this.processFiles(files);
  }

  onDragOver(event: DragEvent): void {
    if (!this.canManageAttachments()) return;
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.uploadDragOver.set(false);
    if (!this.canManageAttachments()) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.processFiles(files);
  }

  private processFiles(files: File[]): void {
    if (!files.length) return;
    const allowedFiles = files.filter((file) => ALLOWED_TASK_FILE_TYPES.has(file.type) && file.size <= MAX_TASK_FILE_SIZE);
    if (allowedFiles.length !== files.length) this.error.set(true);
    if (!allowedFiles.length) return;

    this.error.set(false);
    for (const file of allowedFiles) {
      const id = Date.now() + Math.random();
      this.uploads.update((items) => [...items, { id, name: file.name, progress: 0 }]);
      this.api.uploadAttachment(this.taskCode(), file)
        .pipe(finalize(() => {
          this.uploads.update((items) => items.filter((item) => item.id !== id));
          this.uploading.set(this.uploads().length > 0);
        }), takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
              this.uploads.update((items) => items.map((item) => item.id === id ? { ...item, progress } : item));
            } else if (event.type === HttpEventType.Response) {
              this.loadAttachments();
            }
          },
          error: () => { this.error.set(true); this.loadAttachments(); },
        });
      this.uploading.set(true);
    }
  }

  openPreview(attachment: WorkspaceTaskAttachment): void {
    this.previewAttachment.set(attachment);
    this.clearPreviewUrl();

    if (!this.isImage(attachment.fileName)) {
      this.previewLoading.set(false);
      return;
    }

    const cachedThumb = this.thumbnails()[attachment.code];
    if (cachedThumb) {
      this.previewImageUrl.set(cachedThumb);
      this.previewLoading.set(false);
      return;
    }

    this.previewLoading.set(true);
    this.api.downloadAttachment(attachment.code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.previewObjectUrl = url;
        this.previewImageUrl.set(url);
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.previewAttachment.set(null);
    this.previewLoading.set(false);
    this.clearPreviewUrl();
  }

  download(attachment: WorkspaceTaskAttachment, event?: Event): void {
    event?.stopPropagation();
    this.api.downloadAttachment(attachment.code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = attachment.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set(true),
    });
  }

  confirmAttachmentDelete(attachment: WorkspaceTaskAttachment, event?: Event): void {
    event?.stopPropagation();
    this.attachmentToDelete.set(attachment);
  }

  deleteAttachment(): void {
    const attachment = this.attachmentToDelete();
    if (!attachment || this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteAttachment(attachment.code).pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.attachmentToDelete.set(null);
          if (this.previewAttachment()?.code === attachment.code) this.closePreview();
          this.loadAttachments();
        },
        error: () => this.error.set(true),
      });
  }

  onCommentInput(value: string, target: 'comment' | 'reply', textarea: HTMLTextAreaElement): void {
    if (target === 'comment') this.commentText.set(value);
    else this.replyText.set(value);

    const cursorPos = textarea.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(beforeCursor[lastAt - 1]))) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      if (!/[\r\n]/.test(afterAt) && afterAt.split(' ').length <= 2) {
        this.mentionFilter.set(afterAt);
        this.mentionTarget.set(target);
        return;
      }
    }
    if (this.mentionTarget() === target) {
      this.mentionTarget.set(null);
    }
  }

  selectMention(member: WorkspaceDetailMember, target: 'comment' | 'reply', textarea: HTMLTextAreaElement): void {
    const value = target === 'comment' ? this.commentText() : this.replyText();
    const cursorPos = textarea.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt === -1) return;

    const beforeAt = beforeCursor.slice(0, lastAt);
    const nextValue = `${beforeAt}@${member.fullname} ${afterCursor}`;
    if (target === 'comment') this.commentText.set(nextValue);
    else this.replyText.set(nextValue);

    this.mentionTarget.set(null);
    setTimeout(() => {
      textarea.focus();
      const nextCursor = lastAt + member.fullname.length + 2;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  closeMentionDropdown(): void {
    this.mentionTarget.set(null);
  }

  parseContentParts(content: string): CommentContentPart[] {
    const candidates = this.mentionCandidates();
    if (!content) return [];

    // Highlight known member mentions first, or fallback to @Word pattern
    const regex = /@([\p{L}\p{N}_]+(?:\s[\p{L}\p{N}_]+)?)/gu;
    const parts: CommentContentPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index), isMention: false });
      }
      const matchedText = match[1];
      const matchedMember = candidates.find((m) => matchedText.toLowerCase().startsWith(m.fullname.toLowerCase()));
      if (matchedMember && matchedText.length > matchedMember.fullname.length) {
        const mentionStr = `@${matchedMember.fullname}`;
        parts.push({ text: mentionStr, isMention: true });
        const remainder = match[0].slice(mentionStr.length);
        if (remainder) parts.push({ text: remainder, isMention: false });
      } else {
        parts.push({ text: match[0], isMention: true });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), isMention: false });
    }
    return parts.length ? parts : [{ text: content, isMention: false }];
  }

  private extractMentionIds(content: string): number[] {
    const candidates = this.mentionCandidates();
    const lowerContent = content.toLowerCase();
    const ids: number[] = [];
    for (const member of candidates) {
      const token = `@${member.fullname.toLowerCase()}`;
      if (lowerContent.includes(token) && !ids.includes(member.workspaceMemberId)) {
        ids.push(member.workspaceMemberId);
      }
    }
    return ids;
  }

  submitComment(parentId?: number): void {
    const content = (parentId === undefined ? this.commentText() : this.replyText()).trim();
    if (!content || this.sendingComment()) return;
    const mentions = this.extractMentionIds(content);
    this.sendingComment.set(true);
    this.error.set(false);
    this.mentionTarget.set(null);

    this.api.createComment(this.taskCode(), content, parentId, mentions)
      .pipe(finalize(() => this.sendingComment.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (parentId === undefined) this.commentText.set('');
          else { this.replyTo.set(null); this.replyText.set(''); }
          this.loadComments();
        },
        error: () => this.error.set(true),
      });
  }

  confirmCommentDelete(comment: WorkspaceTaskComment): void { this.commentToDelete.set(comment); }

  cancelReply(): void {
    this.replyTo.set(null);
    this.replyText.set('');
    if (this.mentionTarget() === 'reply') this.mentionTarget.set(null);
  }

  commentCount(): number {
    return this.comments().reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0);
  }

  deleteComment(): void {
    const comment = this.commentToDelete();
    if (!comment || this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteComment(comment.code).pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => { this.commentToDelete.set(null); this.loadComments(); }, error: () => this.error.set(true) });
  }

  authorAvatarPhoto(author: WorkspaceTaskComment['author']): string | null {
    const rawPhoto = author.photo;
    if (rawPhoto && (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://') || rawPhoto.startsWith('/'))) {
      return rawPhoto;
    }
    const workspaceMember = this.detailStore.workspace()?.members.find((m) => m.workspaceMemberId === author.id);
    return workspaceMember?.photo ?? null;
  }

  canDeleteComment(comment: WorkspaceTaskComment): boolean {
    return this.detailStore.isActive() && (comment.author.id === this.currentMemberId() || this.detailStore.isOwner());
  }

  fileExt(fileName: string): string {
    const idx = fileName.lastIndexOf('.');
    return idx > 0 ? fileName.slice(idx + 1).toLowerCase() : '';
  }

  fileTypeLabel(fileName: string): string {
    const ext = this.fileExt(fileName);
    return ext ? ext.toUpperCase() : 'FILE';
  }

  isImage(fileName: string): boolean {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(this.fileExt(fileName));
  }

  accentColor(fileName: string): string {
    const ext = this.fileExt(fileName);
    if (ext === 'pdf') return '#ef4444';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '#3b82f6';
    if (['doc', 'docx'].includes(ext)) return '#6366f1';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#10b981';
    if (['ppt', 'pptx'].includes(ext)) return '#f59e0b';
    return '#64748b';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadAttachments(): void {
    this.loadingAttachments.set(true);
    this.api.getAttachments(this.taskCode()).pipe(finalize(() => this.loadingAttachments.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.attachments.set(items);
          this.loadImageThumbnails(items);
        },
        error: () => this.error.set(true),
      });
  }

  private loadImageThumbnails(items: WorkspaceTaskAttachment[]): void {
    for (const item of items) {
      if (!this.isImage(item.fileName) || this.thumbnailCache.has(item.code)) continue;
      this.api.downloadAttachment(item.code).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.thumbnailCache.set(item.code, url);
          this.thumbnails.update((prev) => ({ ...prev, [item.code]: url }));
        },
      });
    }
  }

  private clearThumbnails(): void {
    for (const url of this.thumbnailCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.thumbnailCache.clear();
  }

  private clearPreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewImageUrl.set(null);
  }

  private loadComments(): void {
    this.loadingComments.set(true);
    this.api.getComments(this.taskCode()).pipe(finalize(() => this.loadingComments.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.comments.set(items), error: () => this.error.set(true) });
  }
}
