import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StorageService } from '../../services/storage-service';
import { WorkspaceStateService } from '../../../workspace/services/workspace-state-service';
import { AuthService } from '../../../auth/services/auth.service';
import { ProfileService } from '../../../profile/services/profile.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'shared-top-bar',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly workspaceState = inject(WorkspaceStateService);
  private readonly profileService = inject(ProfileService);

  protected readonly authService = inject(AuthService);
  protected dropdownOpen = false;
  protected readonly unreadNotifications = signal(3);
  protected workspace = toSignal(this.workspaceState.workspace$);

  toggleTheme(): void {
    const next = this.authService.settings().theme === 'light' ? 'dark' : 'light';
    this.profileService.updateSettings({ theme: next }).subscribe({
      next: (updated) => {
        this.authService.settings.set(updated);
      },
    });
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  logout(): void {
    this.storage.removeToken();
    this.router.navigate(['/auth/login']);
  }

}
