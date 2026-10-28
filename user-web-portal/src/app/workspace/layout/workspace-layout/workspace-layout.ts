import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';

@Component({
  selector: 'app-workspace-layout',
  imports: [RouterLink, RouterOutlet, TranslatePipe, UpperCasePipe],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.css',
})
export class WorkspaceLayout {
  readonly appName = environment.appName;
  readonly translation = inject(TranslationService);

  constructor() {
    void this.translation.setLanguage(this.translation.currentLang());
  }

  toggleLanguage(): void {
    const language = this.translation.currentLang() === 'es' ? 'en' : 'es';
    void this.translation.setLanguage(language);
  }
}
