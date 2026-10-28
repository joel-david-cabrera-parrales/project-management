import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-workspace-filter-input',
  imports: [TranslatePipe],
  templateUrl: './workspace-filter-input.html',
  styleUrl: './workspace-filter-input.css',
})
export class WorkspaceFilterInput {
  readonly inputId = input.required<string>();
  readonly value = input('');
  readonly placeholderKey = input.required<string>();
  readonly valueChange = output<string>();

  update(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
