import { Component, HostListener, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-workspace-drawer',
  imports: [TranslatePipe],
  templateUrl: './workspace-drawer.html',
  styleUrl: './workspace-drawer.css',
})
export class WorkspaceDrawer {
  readonly open = input(false);
  readonly titleKey = input.required<string>();
  readonly busy = input(false);
  readonly close = output<void>();

  requestClose(): void {
    if (!this.busy()) this.close.emit();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.requestClose();
  }
}
