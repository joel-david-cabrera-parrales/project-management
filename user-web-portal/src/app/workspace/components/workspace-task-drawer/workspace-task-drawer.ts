import { Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable, of, switchMap } from 'rxjs';
import { dateRangeValidator } from '../../../shared/validators/date-range.validator';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceDrawer } from '../workspace-drawer/workspace-drawer';
import { WorkspaceTasksApiService } from '../../data-access/workspace-tasks-api.service';
import { WorkspaceLabelsApiService } from '../../data-access/workspace-labels-api.service';
import { WorkspaceAvatar } from '../workspace-avatar/workspace-avatar';
import { WorkspaceTaskActivity } from '../workspace-task-activity/workspace-task-activity';
import { WorkspaceDetailTaskList, WorkspaceLabel, WorkspaceTask } from '../../models/workspace-detail.models';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

@Component({
  selector: 'app-workspace-task-drawer',
  imports: [ReactiveFormsModule, TranslatePipe, WorkspaceDrawer, WorkspaceAvatar, WorkspaceTaskActivity],
  templateUrl: './workspace-task-drawer.html',
  styleUrl: './workspace-task-drawer.css',
})
export class WorkspaceTaskDrawer {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(WorkspaceTasksApiService);
  private readonly labelsApi = inject(WorkspaceLabelsApiService);
  private readonly detailStore = inject(WorkspaceDetailStore);

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
  readonly canRemoveAssociations = this.detailStore.isOwner;

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
    description: ['', [Validators.minLength(5), Validators.maxLength(2000)]],
    dateInit: [''],
    dateEnd: [''],
  }, { validators: dateRangeValidator('dateInit', 'dateEnd') });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const task = this.task();
      this.saveError.set(false);
      this.currentTask.set(task);
      this.selectedLabelIds.set(task?.labels.map((label) => label.id) ?? []);
      this.showLabelOptions.set(false);
      this.selectedMemberIds.set(task?.assignees.map((assignee) => assignee.workspaceMemberId) ?? []);
      this.loadLabels();
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
      finalize(() => this.saving.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.saved.emit(),
      error: () => this.saveError.set(true),
    });
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

  private loadLabels(): void {
    this.loadingLabels.set(true);
    this.labelLoadError.set(false);
    this.labelsApi.getLabels(this.workspaceCode())
      .pipe(finalize(() => this.loadingLabels.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (labels) => this.availableLabels.set(labels),
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
