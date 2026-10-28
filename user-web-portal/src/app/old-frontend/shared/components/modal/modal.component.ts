import { Component, input, output } from '@angular/core';

@Component({
  selector: 'shared-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent {
  open = input(false);
  title = input('');
  size = input<'sm' | 'md' | 'lg'>('md');
  close = output<void>();
}
