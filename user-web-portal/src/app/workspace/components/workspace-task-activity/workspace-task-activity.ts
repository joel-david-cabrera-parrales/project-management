import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceTaskActivityApiService } from '../../data-access/workspace-task-activity-api.service';
import { WorkspaceTaskAttachment, WorkspaceTaskComment } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';
import { WorkspaceAvatar } from '../workspace-avatar/workspace-avatar';
import { WorkspaceConfirmDialog } from '../workspace-confirm-dialog/workspace-confirm-dialog';

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Component({
  selector: 'app-workspace-task-activity',
  imports: [DatePipe, DecimalPipe, TranslatePipe, WorkspaceAvatar, WorkspaceConfirmDialog],
  templateUrl: './workspace-task-activity.html',
  styleUrl: './workspace-task-activity.css',
})
export class WorkspaceTaskActivity implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceTaskActivityApiService);
  private readonly detailStore = inject(WorkspaceDetailStore);

  readonly taskCode = input.required<string>();
  readonly attachments = signal<WorkspaceTaskAttachment[]>([]);
  readonly comments = signal<WorkspaceTaskComment[]>([]);
  readonly loadingAttachments = signal(true);
  readonly loadingComments = signal(true);
  readonly uploading = signal(false);
  readonly uploads = signal<{ id: number; name: string; progress: number }[]>([]);
  readonly sendingComment = signal(false);
  readonly error = signal(false);
  readonly commentText = signal('');
  readonly replyTo = signal<number | null>(null);
  readonly replyText = signal('');
  readonly attachmentToDelete = signal<WorkspaceTaskAttachment | null>(null);
  readonly commentToDelete = signal<WorkspaceTaskComment | null>(null);
  readonly deleting = signal(false);
  readonly currentMemberId = computed(() => this.detailStore.workspace()?.workspaceMemberId ?? null);
  readonly canComment = computed(() => this.detailStore.workspace()?.roleMember !== 'viewer');
  readonly canManageAttachments = computed(() => ['owner', 'member'].includes(this.detailStore.workspace()?.roleMember ?? ''));

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loadAttachments();
    this.loadComments();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const allowedFiles = files.filter((file) => ALLOWED_FILE_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE);
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

  download(attachment: WorkspaceTaskAttachment): void {
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

  confirmAttachmentDelete(attachment: WorkspaceTaskAttachment): void { this.attachmentToDelete.set(attachment); }

  deleteAttachment(): void {
    const attachment = this.attachmentToDelete();
    if (!attachment || this.deleting()) return;
    this.deleting.set(true);
    this.api.deleteAttachment(attachment.code).pipe(finalize(() => this.deleting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => { this.attachmentToDelete.set(null); this.loadAttachments(); }, error: () => this.error.set(true) });
  }

  submitComment(parentId?: number): void {
    const content = (parentId === undefined ? this.commentText() : this.replyText()).trim();
    if (!content || this.sendingComment()) return;
    this.sendingComment.set(true);
    this.api.createComment(this.taskCode(), content, parentId)
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

  canDeleteComment(comment: WorkspaceTaskComment): boolean {
    return comment.author.id === this.currentMemberId();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadAttachments(): void {
    this.loadingAttachments.set(true);
    this.api.getAttachments(this.taskCode()).pipe(finalize(() => this.loadingAttachments.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.attachments.set(items), error: () => this.error.set(true) });
  }

  private loadComments(): void {
    this.loadingComments.set(true);
    this.api.getComments(this.taskCode()).pipe(finalize(() => this.loadingComments.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.comments.set(items), error: () => this.error.set(true) });
  }
}
