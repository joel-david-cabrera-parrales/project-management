import { Component } from '@angular/core';
import { SideBar } from '../../shared/components/side-bar/side-bar';
import { TopBar } from '../../shared/components/top-bar/top-bar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [SideBar, TopBar, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {}
