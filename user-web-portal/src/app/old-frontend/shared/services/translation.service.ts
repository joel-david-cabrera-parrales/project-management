import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private readonly http = inject(HttpClient);

  // Expose current language and translation map as signals
  public currentLang = signal<'es' | 'en'>('es');
  private translations = signal<Record<string, any>>({});

  /**
   * Loads the translations for a given language.
   * Resolves when translations are successfully loaded.
   */
  public async setLanguage(lang: 'es' | 'en'): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, any>>(`/i18n/${lang}.json`)
      );
      this.translations.set(data);
      this.currentLang.set(lang);
    } catch (error) {
      console.error(`Error loading translations for language: ${lang}`, error);
    }
  }

  /**
   * Helper to translate a dotted-path key (e.g. 'settings.title').
   * Supports interpolation: 'Paso {{current}} de {{total}}' with params: { current: 1, total: 3 }
   */
  public translate(key: string, params?: Record<string, unknown>): string {
    const keys = key.split('.');
    let current: any = this.translations();

    for (const k of keys) {
      if (current && current[k] !== undefined) {
        current = current[k];
      } else {
        return key; // Fallback to key if not found
      }
    }

    const result = typeof current === 'string' ? current : key;
    if (!params) return result;
    return result.replace(/\{\{(\w+)\}\}/g, (_, p) => {
      const val = params[p];
      return val !== undefined ? String(val) : `{{${p}}}`;
    });
  }
}
