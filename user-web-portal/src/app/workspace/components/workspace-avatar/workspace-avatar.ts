import { Component, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-workspace-avatar',
  templateUrl: './workspace-avatar.html',
  styleUrl: './workspace-avatar.css',
})
export class WorkspaceAvatar {
  readonly name = input.required<string>();
  readonly photo = input<string | null>(null);
  readonly initials = input('');
  readonly color = input('#2563eb');
  readonly size = input<'sm' | 'md'>('md');
  readonly imageError = signal(false);

  constructor() {
    effect(() => {
      this.photo();
      this.imageError.set(false);
    });
  }
}
