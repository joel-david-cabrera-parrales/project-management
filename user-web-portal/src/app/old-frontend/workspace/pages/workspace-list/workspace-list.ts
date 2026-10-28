import { Component, inject, OnInit, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { WorkspaceService } from '../../services/workspace-service';
import { Workspace } from '../../models/workspace.models';
import { WorkspaceCard } from '../../components/workspace-card/workspace-card';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { WorkspaceForm } from '../../components/workspace-form/workspace-form';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-list',
  imports: [WorkspaceCard, ModalComponent, WorkspaceForm, TranslatePipe],
  templateUrl: './workspace-list.html',
  styleUrl: './workspace-list.css',
})
export class WorkspaceList implements OnInit {
  private readonly workspaceService = inject(WorkspaceService);

  private readonly notificationService = inject(NotificationService);

  private readonly workspaceState = inject(WorkspaceStateService);

  public readonly openModal = signal(false);

  public deleteWorkspaceTarget = signal<Workspace | null>(null);
  public deleting = signal(false);

  public readonly workspaces = rxResource({
    stream: () => this.workspaceService.getAllWorkspacesByUserId(),
    defaultValue: [],
  });

  public workspace = signal<Workspace | null>(null);
  public titleModal = signal('');

  ngOnInit(): void {
    this.workspaceState.clearWorkspace();
  }

  public selectWorkspace(workspace: Workspace) {
    this.workspaceService.getAWorkspace(workspace.id).subscribe((res) => {
      if (!res) {
        this.notificationService.error('El espacio de trabajo no existe', { title: 'Error al obtener el espacio de trabajo' });
        return;
      }
      this.workspace.set(res);
      this.titleModal.set('Editar espacio de trabajo');
      this.toggleModal();
    });
  }

  createWorkspace() {
    this.titleModal.set('Crear espacio de trabajo');
    this.workspace.set(null);
    this.toggleModal();
  }

  openDeleteWorkspaceConfirm(workspace: Workspace): void {
    this.deleteWorkspaceTarget.set(workspace);
  }

  closeDeleteWorkspaceConfirm(): void {
    this.deleteWorkspaceTarget.set(null);
  }

  onConfirmDeleteWorkspace(): void {
    const workspace = this.deleteWorkspaceTarget();
    if (!workspace) return;
    this.deleting.set(true);
    this.workspaceService.deleteWorkspace(workspace.id).subscribe(() => {
      this.deleting.set(false);
      this.deleteWorkspaceTarget.set(null);
      this.notificationService.success('El espacio de trabajo se ha eliminado exitosamente.', { title: 'Espacio de trabajo eliminado' });
      this.workspaces.reload();
    });
  }

  updateWorkspace(workspace: Workspace) {
    this.selectWorkspace(workspace);
  }

  public toggleModal() {
    this.openModal.set(!this.openModal());
  }

  workspaceCreatedOrUpdated() {
    this.titleModal.set('');
    this.toggleModal();
    this.workspace.set(null);
    this.workspaces.reload();
  }
}
