import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceDetailStore } from '../../state/workspace-detail.store';

@Component({
  selector: 'app-workspace-board-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './workspace-board-page.html',
  styleUrl: './workspace-board-page.css',
})
export class WorkspaceBoardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(WorkspaceDetailStore);
  readonly boardCode = signal<string | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(map((params) => params.get('boardCode')), takeUntilDestroyed(this.destroyRef))
      .subscribe((code) => this.boardCode.set(code));
  }
}
