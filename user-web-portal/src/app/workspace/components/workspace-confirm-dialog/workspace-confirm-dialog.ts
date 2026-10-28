import { Component, input, output } from '@angular/core';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-workspace-confirm-dialog',
  imports: [ModalComponent, TranslatePipe],
  templateUrl: './workspace-confirm-dialog.html',
  styleUrl: './workspace-confirm-dialog.css',
})
export class WorkspaceConfirmDialog {
  readonly open = input(false);
  readonly titleKey = input.required<string>();
  readonly descriptionKey = input.required<string>();
  readonly descriptionParams = input<Record<string, unknown>>({});
  readonly confirmKey = input('common.delete');
  readonly pendingKey = input('common.deleting');
  readonly pending = input(false);
  readonly close = output<void>();
  readonly confirm = output<void>();
}
