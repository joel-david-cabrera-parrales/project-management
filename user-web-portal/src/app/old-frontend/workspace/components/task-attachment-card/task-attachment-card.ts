import { Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TaskAttachment } from '../../models/workspace.models';
import { WorkspaceStateService } from '../../services/workspace-state-service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'workspace-task-attachment-card',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './task-attachment-card.html',
  styleUrl: './task-attachment-card.css',
})
export class TaskAttachmentCard {
  private readonly workspaceState = inject(WorkspaceStateService);
  protected workspace = toSignal(this.workspaceState.workspace$);

  attachment = input.required<TaskAttachment>();

  preview = output<TaskAttachment>();
  download = output<TaskAttachment>();
  delete = output<TaskAttachment>();

  protected fileExt = computed(() => {
    const name = this.attachment().fileName;
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
  });

  protected fileTypeLabel = computed(() => {
    const ext = this.fileExt();
    const map: Record<string, string> = {
      pdf: 'PDF', png: 'PNG', jpg: 'JPG', jpeg: 'JPEG', gif: 'GIF', webp: 'WEBP',
      doc: 'DOC', docx: 'DOCX', xls: 'XLS', xlsx: 'XLSX', ppt: 'PPT', pptx: 'PPTX',
      svg: 'SVG', mp4: 'MP4', zip: 'ZIP', rar: 'RAR',
    };
    return map[ext] || ext.toUpperCase() || 'FILE';
  });

  protected isImage = computed(() => {
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(this.fileExt());
  });

  protected accentColor = computed(() => {
    const ext = this.fileExt();
    if (['pdf'].includes(ext)) return '#ef4444';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '#3B82F6';
    if (['doc', 'docx'].includes(ext)) return '#6366F1';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '#10B981';
    if (['ppt', 'pptx'].includes(ext)) return '#F59E0B';
    if (['zip', 'rar', 'gz', '7z'].includes(ext)) return '#8B5CF6';
    return '#6B7280';
  });

  protected formattedSize = computed(() => {
    const bytes = this.attachment().fileSize;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  protected onPreview(): void {
    this.preview.emit(this.attachment());
  }

  protected onDownload(event: MouseEvent): void {
    event.stopPropagation();
    this.download.emit(this.attachment());
  }

  protected onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.delete.emit(this.attachment());
  }
}
