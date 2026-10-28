import { Component, inject, signal } from '@angular/core';
import { Assignment, Member } from '../../models/workspace.models';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TaskService } from '../../services/task-service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-assignee-picker',
  imports: [TranslatePipe],
  templateUrl: './assignee-picker.html',
  styleUrl: './assignee-picker.css',
})
export class AssigneePicker {
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly taskService = inject(TaskService);

  task = toSignal(this.workspaceState.selectedTask$);
  workspace = toSignal(this.workspaceState.workspace$);

  protected showDropdown = signal(false);
  protected dropdownPosition = signal({ x: 0, y: 0 });
  protected tooltipVisible = signal(false);
  protected tooltipContent = signal<Assignment | null>(null);
  protected tooltipPosition = signal({ x: 0, y: 0 });
  protected loading = signal(false);

  protected get assignees(): Assignment[] {
    return this.task()?.assignees ?? [];
  }

  protected get availableMembers(): Member[] {
    return this.workspace()?.members ?? [];
  }

  protected isAssigned(workspaceMemberId: number): boolean {
    return this.assignees.some((a) => a.workspaceMemberId === workspaceMemberId);
  }

  protected getAssignmentForMember(workspaceMemberId: number): Assignment | undefined {
    return this.assignees.find((a) => a.workspaceMemberId === workspaceMemberId);
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.dropdownPosition.set({ x: rect.left, y: rect.bottom + 6 });
    this.showDropdown.update((v) => !v);
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  async assign(member: Member): Promise<void> {
    const currentTask = this.task();
    if (!currentTask || this.loading()) return;
    this.loading.set(true);
    this.taskService.assignTask(currentTask.id, member.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.showDropdown.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  async unassign(assignment: Assignment): Promise<void> {
    const currentTask = this.task();
    if (!currentTask || this.loading()) return;
    this.loading.set(true);
    this.taskService.unassignTask(currentTask.id, assignment.id).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  showTooltip(event: MouseEvent, member: Assignment): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tooltipPosition.set({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    this.tooltipContent.set(member);
    this.tooltipVisible.set(true);
  }

  hideTooltip(): void {
    this.tooltipVisible.set(false);
  }
}
