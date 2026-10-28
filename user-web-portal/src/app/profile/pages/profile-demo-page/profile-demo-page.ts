import { Component, computed, inject, signal } from '@angular/core';
import { StorageService } from '../../../shared/services/storage.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile-demo-page',
  imports: [TranslatePipe],
  templateUrl: './profile-demo-page.html',
  styleUrl: './profile-demo-page.css',
})
export class ProfileDemoPage {
  private readonly storage = inject(StorageService);
  readonly profile = signal(this.storage.getProfile());
  readonly displayName = computed(() => this.profile()?.fullName || this.profile()?.email || '');
  readonly initials = computed(() => this.displayName().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase()).join('') || 'U');
}
