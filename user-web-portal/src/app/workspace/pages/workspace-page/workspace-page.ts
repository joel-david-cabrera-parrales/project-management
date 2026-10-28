import { RouterLink } from "@angular/router";
import { TranslatePipe } from "../../../shared/pipes/translate.pipe";
import { Component, inject, OnInit, signal } from "@angular/core";
import { finalize } from "rxjs";
import { WorkspaceListApiService } from "../../data-access/workspace-list-api.service";
import { WorkspaceListItem } from "../../models/workspace-list.models";


@Component({
  selector: 'app-workspace-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './workspace-page.html',
  styleUrl: './workspace-page.css',
})
export class WorkspacePage implements OnInit {
  private readonly workspaceApi = inject(WorkspaceListApiService);

  readonly workspaces = signal<WorkspaceListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.workspaceApi
      .getWorkspaces()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (workspaces) => this.workspaces.set(workspaces),
        error: () => this.loadError.set(true),
      });
  }
}
