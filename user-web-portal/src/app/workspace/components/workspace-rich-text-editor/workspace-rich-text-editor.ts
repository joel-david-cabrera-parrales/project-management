import { AfterViewInit, Component, ElementRef, forwardRef, input, NgZone, OnChanges, OnDestroy, SecurityContext, signal, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-workspace-rich-text-editor',
  imports: [TranslatePipe],
  templateUrl: './workspace-rich-text-editor.html',
  styleUrl: './workspace-rich-text-editor.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => WorkspaceRichTextEditor), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => WorkspaceRichTextEditor), multi: true },
  ],
})
export class WorkspaceRichTextEditor implements ControlValueAccessor, Validator, AfterViewInit, OnDestroy, OnChanges {
  readonly label = input('');
  readonly placeholder = input('Escribe una descripción…');
  readonly linkPrompt = input('Introduce la URL del enlace');
  readonly minHeight = input(112);
  readonly maxHeight = input(500);
  readonly maxLength = input(500);
  readonly minLength = input(0);
  readonly showCount = input(true);
  readonly readOnly = input(false);

  @ViewChild('editorHost') private editorHost?: ElementRef<HTMLDivElement>;

  readonly characters = signal(0);
  readonly disabled = signal(false);
  readonly selectionRevision = signal(0);
  readonly ready = signal(false);

  private editor?: TiptapEditor;
  private destroyed = false;
  private value = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    const host = this.editorHost?.nativeElement;
    if (!host) return;

    void this.initializeEditor(host);
  }

  private async initializeEditor(host: HTMLDivElement): Promise<void> {
    const [core, starterKit, linkExtension, underlineExtension, placeholderExtension] = await Promise.all([
      import('@tiptap/core'),
      import('@tiptap/starter-kit'),
      import('@tiptap/extension-link'),
      import('@tiptap/extension-underline'),
      import('@tiptap/extension-placeholder'),
    ]);
    if (this.destroyed) return;

    const Editor = core.Editor;
    const StarterKit = starterKit.default;
    const Link = linkExtension.default;
    const Underline = underlineExtension.default;
    const Placeholder = placeholderExtension.default;

    this.editor = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] } }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
          isAllowedUri: (href) => /^(https?:|mailto:|tel:|\/|#)/i.test(href),
        }),
        Placeholder.configure({ placeholder: this.placeholder() }),
      ],
      content: this.safeHtml(this.value),
      editable: this.isEditable(),
      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': this.label() || 'Editor de texto enriquecido',
          class: 'workspace-rich-text-surface',
        },
      },
      onCreate: ({ editor }) => this.updateCharacterCount(editor),
      onUpdate: ({ editor }) => this.zone.run(() => {
        const text = editor.getText();
        // Tiptap emits schema-controlled HTML; do not sanitize on every keystroke,
        // because a transformed CVA value can be written back and reset the selection.
        const html = text.trim() ? editor.getHTML() : '';
        this.value = html;
        this.characters.set(text.length);
        this.onChange(html);
        this.onValidatorChange();
      }),
      onSelectionUpdate: () => this.zone.run(() => this.selectionRevision.update((revision) => revision + 1)),
    });
    this.editor.setEditable(this.isEditable());
    this.ready.set(true);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.editor?.setEditable(this.isEditable());
    this.onValidatorChange();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.editor?.destroy();
  }

  writeValue(value: string | null | undefined): void {
    this.value = value ?? '';
    this.characters.set(this.plainText(this.value).length);
    if (this.editor && this.editor.getHTML() !== this.safeHtml(this.value)) {
      this.editor.commands.setContent(this.safeHtml(this.value), false);
    }
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    this.editor?.setEditable(this.isEditable());
  }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }

  validate(): ValidationErrors | null {
    const length = this.characters();
    if (length > this.maxLength()) return { maxlength: { requiredLength: this.maxLength(), actualLength: length } };
    if (length > 0 && length < this.minLength()) return { minlength: { requiredLength: this.minLength(), actualLength: length } };
    return null;
  }

  format(command: string): void {
    if (!this.editor || !this.isEditable()) return;
    const chain = this.editor.chain().focus();
    if (command === 'bold') chain.toggleBold().run();
    else if (command === 'italic') chain.toggleItalic().run();
    else if (command === 'underline') chain.toggleUnderline().run();
    else if (command === 'strike') chain.toggleStrike().run();
    else if (command === 'bulletList') chain.toggleBulletList().run();
    else if (command === 'orderedList') chain.toggleOrderedList().run();
    else if (command === 'blockquote') chain.toggleBlockquote().run();
    else if (command === 'undo') chain.undo().run();
    else if (command === 'redo') chain.redo().run();
    else if (command === 'paragraph') chain.setParagraph().run();
    else if (command === 'h2') chain.setHeading({ level: 2 }).run();
    else if (command === 'h3') chain.setHeading({ level: 3 }).run();
    else if (command === 'unlink') chain.unsetLink().run();
    else if (command === 'link') this.toggleLink();
  }

  isActive(name: string, attributes?: Record<string, unknown>): boolean {
    this.selectionRevision();
    return this.editor?.isActive(name, attributes) ?? false;
  }

  canUndo(): boolean { this.selectionRevision(); return this.editor?.can().undo() ?? false; }
  canRedo(): boolean { this.selectionRevision(); return this.editor?.can().redo() ?? false; }

  private toggleLink(): void {
    if (!this.editor) return;
    if (this.editor.isActive('link')) {
      this.editor.chain().focus().unsetLink().run();
      return;
    }
    const input = window.prompt(this.linkPrompt());
    if (!input?.trim()) return;
    const href = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
    this.editor.chain().focus().setLink({ href }).run();
  }

  private updateCharacterCount(editor: TiptapEditor): void {
    const length = editor.getText().length;
    this.characters.set(length);
    this.onValidatorChange();
  }

  private plainText(html: string): string {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.safeHtml(html);
    return (wrapper.textContent ?? '').replace(/\u00a0/g, '');
  }

  private safeHtml(html: string): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '';
  }

  private isEditable(): boolean { return !this.disabled() && !this.readOnly(); }
}
