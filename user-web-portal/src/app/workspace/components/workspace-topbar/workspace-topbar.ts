import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { StorageService } from '../../../shared/services/storage.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { WorkspaceListStore } from '../../state/workspace-list.store';

type TopbarPopover = 'navigation' | 'apps' | 'search' | 'help' | 'notifications' | 'profile' | null;

@Component({
  selector: 'app-workspace-topbar',
  imports: [RouterLink, TranslatePipe, UpperCasePipe],
  templateUrl: './workspace-topbar.html',
  styleUrl: './workspace-topbar.css',
})
export class WorkspaceTopbar {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly storage = inject(StorageService);
  readonly translation = inject(TranslationService);
  readonly theme = inject(ThemeService);
  readonly store = inject(WorkspaceListStore);

  readonly activePopover = signal<TopbarPopover>(null);
  readonly showWorkspaceSearch = signal(false);
  readonly profile = signal(this.storage.getProfile());
  readonly profileName = computed(() => this.profile()?.fullName?.trim() || this.profile()?.email || '');
  readonly profileEmail = computed(() => this.profile()?.email || '');
  readonly profileInitials = computed(() => {
    const name = this.profileName();
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  });

  constructor() {
    this.syncRoute();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncRoute());
  }

  togglePopover(popover: Exclude<TopbarPopover, null>): void {
    this.activePopover.update((active) => active === popover ? null : popover);
  }

  closePopover(): void {
    this.activePopover.set(null);
  }

  updateSearch(event: Event): void {
    this.store.searchQuery.set((event.target as HTMLInputElement).value);
    this.activePopover.set('search');
  }

  clearSearch(): void {
    this.store.searchQuery.set('');
    this.activePopover.set('search');
  }

  openSearch(): void {
    this.activePopover.set('search');
  }

  toggleLanguage(): void {
    const language = this.translation.currentLang() === 'es' ? 'en' : 'es';
    void this.translation.setLanguage(language);
  }

  logout(): void {
    this.storage.removeAll();
    this.closePopover();
    void this.router.navigateByUrl('/auth/signin');
  }

  @HostListener('document:pointerdown', ['$event'])
  closeOnOutsidePointer(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closePopover();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closePopover();
  }

  private syncRoute(): void {
    this.showWorkspaceSearch.set(this.router.url.split('?')[0] === '/workspace');
    this.closePopover();
  }
}
