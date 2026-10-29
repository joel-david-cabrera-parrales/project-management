import { Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, last, map, Observable, of, switchMap } from 'rxjs';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceDrawer } from '../workspace-drawer/workspace-drawer';
import { WorkspaceTasksApiService } from '../../data-access/workspace-tasks-api.service';
import { WorkspaceLabelsApiService } from '../../data-access/workspace-labels-api.service';
import { WorkspaceTaskActivityApiService } from '../../data-access/workspace-task-activity-api.service';
import { WorkspaceAvatar } from '../workspace-avatar/workspace-avatar';
import { ALLOWED_TASK_FILE_TYPES, MAX_TASK_FILE_SIZE, WorkspaceTaskActivity } from '../workspace-task-activity/workspace-task-activity';
import { WorkspaceRichTextEditor } from '../workspace-rich-text-editor/workspace-rich-text-editor';
import { WorkspaceDetailTaskList, WorkspaceLabel, WorkspaceTask } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

export interface PendingTaskFile {
  id: number;
  file: File;
  previewUrl: string | null;
}

@Component({
  selector: 'app-workspace-task-drawer',
  imports: [ReactiveFormsModule, TranslatePipe, WorkspaceDrawer, WorkspaceAvatar, WorkspaceTaskActivity, WorkspaceRichTextEditor],
  templateUrl: './workspace-task-drawer.html',
  styleUrl: './workspace-task-drawer.css',
})
export class WorkspaceTaskDrawer {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceTasksApiService);
  private readonly labelsApi = inject(WorkspaceLabelsApiService);
  private readonly activityApi = inject(WorkspaceTaskActivityApiService);
  private readonly detailStore = inject(WorkspaceDetailStore);
  private labelsLoadedForWorkspace: string | null = null;
  private labelsRequestForWorkspace: string | null = null;

  readonly open = input(false);
  readonly workspaceCode = input.required<string>();
  readonly boardCode = input.required<string>();
  readonly taskList = input.required<WorkspaceDetailTaskList>();
  readonly task = input<WorkspaceTask | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();
  readonly saving = signal(false);
  readonly saveError = signal(false);
  readonly currentTask = signal<WorkspaceTask | null>(null);
  readonly effectiveTask = computed(() => this.currentTask() ?? this.task());
  readonly editing = computed(() => !!this.effectiveTask());
  readonly availableLabels = signal<WorkspaceLabel[]>([]);
  readonly loadingLabels = signal(false);
  readonly labelLoadError = signal(false);
  readonly selectedLabelIds = signal<number[]>([]);
  readonly showLabelOptions = signal(false);
  readonly selectedMemberIds = signal<number[]>([]);
  readonly availableMembers = computed(() => this.detailStore.workspace()?.members ?? []);
  readonly canRemoveAssociations = computed(() => this.detailStore.isActive() && this.detailStore.isOwner());
  readonly canManageAttachments = computed(() => this.detailStore.isActive() && ['owner', 'member'].includes(this.detailStore.workspace()?.roleMember ?? ''));

  // Queued files while creating a task
  readonly pendingFiles = signal<PendingTaskFile[]>([]);
  readonly pendingDragOver = signal(false);
  readonly pendingFileError = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
    description: [''],
    dateInit: [''],
    dateEnd: [''],
  }, { validators: dateRangeValidator('dateInit', 'dateEnd') });

  constructor() {
    let wasOpen = false;
    let previousWorkspaceCode = '';
    effect(() => {
      const isOpen = this.open();
      const workspaceCode = this.workspaceCode();
      if (!isOpen) {
        wasOpen = false;
        this.clearPendingFiles();
        return;
      }
      if (!wasOpen || workspaceCode !== previousWorkspaceCode) this.loadLabels(workspaceCode);
      wasOpen = true;
      previousWorkspaceCode = workspaceCode;
    });

    let formWasOpen = false;
    let formTaskId: number | null = null;
    effect(() => {
      const isOpen = this.open();
      if (!isOpen) {
        formWasOpen = false;
        return;
      }
      const task = this.task();
      const taskId = task?.taskId ?? null;
      if (formWasOpen && formTaskId === taskId) return;
      formWasOpen = true;
      formTaskId = taskId;

      untracked(() => {
        this.saveError.set(false);
        this.pendingFileError.set(false);
        this.clearPendingFiles();
        this.currentTask.set(task);
        this.selectedLabelIds.set(task?.labels.map((label) => label.id) ?? []);
        this.showLabelOptions.set(false);
        this.selectedMemberIds.set(task?.assignees.map((assignee) => assignee.workspaceMemberId) ?? []);
        if (task) {
          this.form.reset({
            title: task.title,
            description: task.description ?? '',
            dateInit: task.dateInit?.slice(0, 10) ?? '',
            dateEnd: task.dateEnd?.slice(0, 10) ?? '',
          });
        } else {
          this.form.reset({ title: '', description: '', dateInit: '', dateEnd: '' });
        }
      });
    });

    this.destroyRef.onDestroy(() => this.clearPendingFiles());
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const title = value.title.trim();
    const description = value.description.trim() || undefined;
    const dateInit = value.dateInit || undefined;
    const dateEnd = value.dateEnd || undefined;
    const task = this.effectiveTask();
    this.saving.set(true);
    this.saveError.set(false);

    const request = task
      ? this.api.updateTask(task.taskId, this.workspaceCode(), {
          title,
          description,
          dateInit,
          dateEnd,
          taskListId: this.taskList().id,
        })
      : this.api.createTask({
          title,
          description,
          dateInit,
          dateEnd,
          position: Math.max(0, ...this.taskList().tasks.map((item) => item.position)) + 1,
          taskListId: this.taskList().id,
          workspaceCode: this.workspaceCode(),
          boardCode: this.boardCode(),
        });

    request.pipe(
      switchMap((savedTask) => {
        this.currentTask.set(savedTask);
        return this.syncAssociations(savedTask);
      }),
      switchMap((savedTask) => this.uploadPendingFiles(savedTask)),
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.saved.emit(),
      error: () => this.saveError.set(true),
    });
  }

  onPendingFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const files = Array.from(inputEl.files ?? []);
    inputEl.value = '';
    this.enqueuePendingFiles(files);
  }

  onPendingDragOver(event: DragEvent): void {
    if (!this.canManageAttachments()) return;
    event.preventDefault();
    event.stopPropagation();
    this.pendingDragOver.set(true);
  }

  onPendingDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.pendingDragOver.set(false);
  }

  onPendingDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.pendingDragOver.set(false);
    if (!this.canManageAttachments()) return;
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.enqueuePendingFiles(files);
  }

  removePendingFile(id: number): void {
    this.pendingFiles.update((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return items.filter((item) => item.id !== id);
    });
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

  toggleLabel(labelId: number): void {
    if (this.isLabelLocked(labelId)) return;
    this.selectedLabelIds.update((ids) => ids.includes(labelId) ? ids.filter((id) => id !== labelId) : [...ids, labelId]);
  }

  toggleLabelOptions(): void {
    this.showLabelOptions.update((open) => !open);
  }

  toggleMember(memberId: number): void {
    if (this.isMemberLocked(memberId)) return;
    this.selectedMemberIds.update((ids) => ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]);
  }

  isLabelSelected(labelId: number): boolean { return this.selectedLabelIds().includes(labelId); }
  isMemberSelected(memberId: number): boolean { return this.selectedMemberIds().includes(memberId); }
  isLabelLocked(labelId: number): boolean { return !this.canRemoveAssociations() && !!this.currentTask()?.labels.some((label) => label.id === labelId); }
  isMemberLocked(memberId: number): boolean { return !this.canRemoveAssociations() && !!this.currentTask()?.assignees.some((assignee) => assignee.workspaceMemberId === memberId); }

  private enqueuePendingFiles(files: File[]): void {
    if (!files.length) return;
    const allowed = files.filter((file) => ALLOWED_TASK_FILE_TYPES.has(file.type) && file.size <= MAX_TASK_FILE_SIZE);
    if (allowed.length !== files.length) this.pendingFileError.set(true);
    else this.pendingFileError.set(false);
    if (!allowed.length) return;

    const entries: PendingTaskFile[] = allowed.map((file) => ({
      id: Date.now() + Math.random(),
      file,
      previewUrl: this.isImage(file.name) ? URL.createObjectURL(file) : null,
    }));
    this.pendingFiles.update((prev) => [...prev, ...entries]);
  }

  private clearPendingFiles(): void {
    const items = untracked(() => this.pendingFiles());
    if (!items.length) return;
    for (const item of items) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    this.pendingFiles.set([]);
  }

  private uploadPendingFiles(task: WorkspaceTask): Observable<WorkspaceTask> {
    const queued = this.pendingFiles();
    if (!queued.length) return of(task);

    const uploads$ = queued.map((entry) =>
      this.activityApi.uploadAttachment(task.code, entry.file).pipe(
        last(),
        catchError(() => of(null)),
      ),
    );
    return forkJoin(uploads$).pipe(
      map(() => {
        this.clearPendingFiles();
        return task;
      }),
    );
  }

  private loadLabels(workspaceCode: string): void {
    if (this.labelsLoadedForWorkspace === workspaceCode || this.labelsRequestForWorkspace === workspaceCode) return;
    this.labelsRequestForWorkspace = workspaceCode;
    this.loadingLabels.set(true);
    this.labelLoadError.set(false);
    this.labelsApi.getLabels(workspaceCode)
      .pipe(finalize(() => {
        if (this.labelsRequestForWorkspace === workspaceCode) this.labelsRequestForWorkspace = null;
        this.loadingLabels.set(false);
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => {
          this.labelsLoadedForWorkspace = workspaceCode;
          this.availableLabels.set(labels);
        },
        error: () => this.labelLoadError.set(true),
      });
  }

  private syncAssociations(task: WorkspaceTask): Observable<WorkspaceTask> {
    const workspaceCode = this.workspaceCode();
    const labels = task.labels ?? [];
    const assignees = task.assignees ?? [];
    const selectedLabels = new Set(this.selectedLabelIds());
    const selectedMembers = new Set(this.selectedMemberIds());

    const labelToAdd = this.availableLabels().find((label) => selectedLabels.has(label.id) && !labels.some((current) => current.id === label.id));
    if (labelToAdd) {
      return this.api.addLabel(task.taskId, workspaceCode, labelToAdd.id).pipe(
        switchMap((updated) => {
          this.currentTask.set(updated);
          return this.syncAssociations(updated);
        }),
      );
    }

    const assigneeToAdd = this.availableMembers().find((member) => selectedMembers.has(member.workspaceMemberId)
      && !assignees.some((current) => current.workspaceMemberId === member.workspaceMemberId));
    if (assigneeToAdd) {
      return this.api.assignMember(task.taskId, workspaceCode, assigneeToAdd.workspaceMemberId).pipe(
        switchMap((updated) => {
          this.currentTask.set(updated);
          return this.syncAssociations(updated);
        }),
      );
    }

    if (this.canRemoveAssociations()) {
      const labelToRemove = labels.find((label) => !selectedLabels.has(label.id));
      if (labelToRemove) {
        return this.api.removeLabel(task.taskId, workspaceCode, labelToRemove.id).pipe(
          switchMap((updated) => {
            this.currentTask.set(updated);
            return this.syncAssociations(updated);
          }),
        );
      }

      const assigneeToRemove = assignees.find((assignee) => !selectedMembers.has(assignee.workspaceMemberId));
      if (assigneeToRemove) {
        return this.api.unassignMember(task.taskId, workspaceCode, assigneeToRemove.id).pipe(
          switchMap((updated) => {
            this.currentTask.set(updated);
            return this.syncAssociations(updated);
          }),
        );
      }
    }

    this.currentTask.set(task);
    return of(task);
  }
}
