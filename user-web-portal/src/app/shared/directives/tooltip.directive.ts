import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, HostListener, Inject, Input, OnChanges, OnDestroy, Renderer2, SimpleChanges } from '@angular/core';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

let tooltipSequence = 0;

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnChanges, OnDestroy {
  @Input('appTooltip') content = '';
  @Input() appTooltipPlacement: TooltipPlacement = 'top';
  @Input() appTooltipDisabled = false;

  private readonly tooltipId = `app-tooltip-${++tooltipSequence}`;
  private tooltipElement: HTMLElement | null = null;
  private enterTimer?: ReturnType<typeof setTimeout>;
  private exitTimer?: ReturnType<typeof setTimeout>;
  private originalDescribedBy: string | null = null;
  private readonly disabledObserver: MutationObserver | null;
  private readonly repositionListener = () => this.positionTooltip();

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    const MutationObserverType = this.document.defaultView?.MutationObserver;
    this.disabledObserver = MutationObserverType
      ? new MutationObserverType(() => {
          if (this.appTooltipDisabled || this.isDisabledControl()) this.hideImmediately();
        })
      : null;
    this.disabledObserver?.observe(this.host.nativeElement, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled'],
    });
  }

  @HostListener('mouseenter')
  onPointerEnter(): void {
    this.scheduleShow();
  }

  @HostListener('mouseleave')
  onPointerLeave(): void {
    this.scheduleHide();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.scheduleShow();
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget instanceof Node && this.host.nativeElement.contains(event.relatedTarget)) return;
    this.scheduleHide();
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.tooltipElement) return;
    event.stopPropagation();
    this.hideImmediately();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.positionTooltip();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['appTooltipDisabled'] || changes['content']) && this.tooltipElement) {
      this.hideImmediately();
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.disabledObserver?.disconnect();
    this.document.defaultView?.removeEventListener('scroll', this.repositionListener, true);
    this.restoreDescribedBy();
    this.removeTooltip();
  }

  private scheduleShow(): void {
    this.clearTimers();
    if (!this.content.trim() || this.appTooltipDisabled || this.isDisabledControl()) return;
    this.enterTimer = setTimeout(() => this.show(), 120);
  }

  private scheduleHide(): void {
    if (this.enterTimer) clearTimeout(this.enterTimer);
    this.enterTimer = undefined;
    if (!this.tooltipElement) return;
    this.exitTimer = setTimeout(() => this.hideImmediately(), 80);
  }

  private show(): void {
    if (!this.document.body || this.appTooltipDisabled || !this.content.trim() || this.isDisabledControl()) return;
    if (!this.tooltipElement) this.createTooltip();
    if (!this.tooltipElement) return;

    if (this.exitTimer) clearTimeout(this.exitTimer);
    this.exitTimer = undefined;
    this.tooltipElement.textContent = this.content;
    this.tooltipElement.setAttribute('data-placement', this.appTooltipPlacement);
    this.tooltipElement.classList.remove('app-tooltip-exit');
    this.tooltipElement.classList.add('app-tooltip-enter');
    this.renderer.setStyle(this.tooltipElement, 'visibility', 'hidden');
    this.positionTooltip();
    this.renderer.setStyle(this.tooltipElement, 'visibility', 'visible');
    this.setDescribedBy();
  }

  private createTooltip(): void {
    const tooltip = this.renderer.createElement('div') as HTMLElement;
    this.renderer.addClass(tooltip, 'app-tooltip-overlay');
    this.renderer.setAttribute(tooltip, 'id', this.tooltipId);
    this.renderer.setAttribute(tooltip, 'role', 'tooltip');
    this.renderer.setAttribute(tooltip, 'data-placement', this.appTooltipPlacement);
    this.renderer.setProperty(tooltip, 'textContent', this.content);

    this.renderer.appendChild(this.document.body, tooltip);
    this.tooltipElement = tooltip;

    this.originalDescribedBy = this.host.nativeElement.getAttribute('aria-describedby');
    this.document.defaultView?.addEventListener('scroll', this.repositionListener, true);
  }

  private positionTooltip(): void {
    const tooltip = this.tooltipElement;
    if (!tooltip) return;

    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const view = this.document.defaultView;
    const viewportWidth = view?.innerWidth ?? this.document.documentElement.clientWidth;
    const viewportHeight = view?.innerHeight ?? this.document.documentElement.clientHeight;
    const margin = 8;
    const gap = 9;
    const opposite: Record<TooltipPlacement, TooltipPlacement> = {
      top: 'bottom', bottom: 'top', left: 'right', right: 'left',
    };
    const candidates: TooltipPlacement[] = [
      this.appTooltipPlacement,
      opposite[this.appTooltipPlacement],
      ...(this.appTooltipPlacement === 'top' || this.appTooltipPlacement === 'bottom'
        ? ['right', 'left'] as TooltipPlacement[]
        : ['top', 'bottom'] as TooltipPlacement[]),
    ];
    const fits = (placement: TooltipPlacement): boolean => {
      if (placement === 'top') return hostRect.top >= tooltipRect.height + gap + margin;
      if (placement === 'bottom') return viewportHeight - hostRect.bottom >= tooltipRect.height + gap + margin;
      if (placement === 'left') return hostRect.left >= tooltipRect.width + gap + margin;
      return viewportWidth - hostRect.right >= tooltipRect.width + gap + margin;
    };
    const placement = candidates.find(fits) ?? this.appTooltipPlacement;

    let left = hostRect.left + (hostRect.width - tooltipRect.width) / 2;
    let top = hostRect.top - tooltipRect.height - gap;
    if (placement === 'bottom') top = hostRect.bottom + gap;
    if (placement === 'left') {
      left = hostRect.left - tooltipRect.width - gap;
      top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
    }
    if (placement === 'right') {
      left = hostRect.right + gap;
      top = hostRect.top + (hostRect.height - tooltipRect.height) / 2;
    }

    left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - tooltipRect.height - margin));
    tooltip.setAttribute('data-placement', placement);
    this.renderer.setStyle(tooltip, 'left', `${left}px`);
    this.renderer.setStyle(tooltip, 'top', `${top}px`);
  }

  private setDescribedBy(): void {
    const existing = this.originalDescribedBy?.split(/\s+/).filter(Boolean) ?? [];
    if (!existing.includes(this.tooltipId)) existing.push(this.tooltipId);
    this.renderer.setAttribute(this.host.nativeElement, 'aria-describedby', existing.join(' '));
  }

  private hideImmediately(): void {
    this.clearTimers();
    if (!this.tooltipElement) return;
    this.tooltipElement.classList.remove('app-tooltip-enter');
    this.tooltipElement.classList.add('app-tooltip-exit');
    this.restoreDescribedBy();
    this.exitTimer = setTimeout(() => this.removeTooltip(), 100);
  }

  private restoreDescribedBy(): void {
    if (this.originalDescribedBy) this.renderer.setAttribute(this.host.nativeElement, 'aria-describedby', this.originalDescribedBy);
    else this.renderer.removeAttribute(this.host.nativeElement, 'aria-describedby');
  }

  private removeTooltip(): void {
    if (!this.tooltipElement) return;
    this.renderer.removeChild(this.document.body, this.tooltipElement);
    this.tooltipElement = null;
    this.document.defaultView?.removeEventListener('scroll', this.repositionListener, true);
  }

  private isDisabledControl(): boolean {
    return this.host.nativeElement.matches(':disabled, [aria-disabled="true"]');
  }

  private clearTimers(): void {
    if (this.enterTimer) clearTimeout(this.enterTimer);
    if (this.exitTimer) clearTimeout(this.exitTimer);
    this.enterTimer = undefined;
    this.exitTimer = undefined;
  }
}
