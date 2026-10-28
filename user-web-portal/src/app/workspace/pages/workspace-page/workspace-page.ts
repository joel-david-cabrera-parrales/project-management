import { Component, inject, OnInit } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { WorkspaceCard } from '../../components/workspace-card/workspace-card';
import { WorkspaceListStore } from '../../state/workspace-list.store';

@Component({
  selector: 'app-workspace-page',
  imports: [TranslatePipe, WorkspaceCard],
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePage implements OnInit {
  readonly store = inject(WorkspaceListStore);

  ngOnInit(): void {
    this.store.load();
  }
}
