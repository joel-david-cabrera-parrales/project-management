import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-workspace-detail-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './workspace-detail-page.html',
  styleUrl: './workspace-detail-page.css',
})
export class WorkspaceDetailPage {
  private readonly route = inject(ActivatedRoute);
  readonly workspaceCode = this.route.snapshot.paramMap.get('workspaceCode') ?? '';
}
