import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { ThemeService } from '../../../shared/services/theme.service';

@Component({
  selector: 'app-settings-demo-page',
  imports: [TranslatePipe, UpperCasePipe],
  templateUrl: './settings-demo-page.html',
  styleUrl: './settings-demo-page.css',
})
export class SettingsDemoPage {
  readonly translation = inject(TranslationService);
  readonly theme = inject(ThemeService);

  toggleLanguage(): void {
    const language = this.translation.currentLang() === 'es' ? 'en' : 'es';
    void this.translation.setLanguage(language);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
