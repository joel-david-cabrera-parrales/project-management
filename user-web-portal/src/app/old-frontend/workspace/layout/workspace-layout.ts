import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideBar } from '../../shared/components/side-bar/side-bar';
import { TopBar } from '../../shared/components/top-bar/top-bar';

@Component({
  selector: 'workspace-layout',
  imports: [RouterOutlet, SideBar, TopBar],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.css',
  standalone: true,
})
export class WorkspaceLayout {}
