import React from 'react';
import { AcademicNote, Subject } from '../../types';
import { PdfViewer } from './PdfViewer';
import { PptxViewer } from './PptxViewer';
import { Download, FileText, X, Cloud, Tag } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';

interface DocumentViewerModalProps {
  note: AcademicNote | null;
  subject?: Subject;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  note,
  subject,
  isOpen,
  onClose
}) => {
  const { showToast } = useToast();

  if (!isOpen || !note) return null;

  const fileName = note.fileName || `${note.title}.${note.fileType === 'pptx' ? 'pptx' : note.fileType === 'pdf' ? 'pdf' : 'txt'}`;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || note.fileType;

  const handleDownload = () => {
    try {
      if (note.fileUrl && note.fileUrl.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = note.fileUrl;
        a.download = fileName;
        a.click();
      } else {
        const content = note.contentText || `# ${note.title}\n\n${note.description || ''}\n\nSyncademic Academic Document Vault`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast(`Downloading ${fileName}`, 'success');
    } catch (err: any) {
      showToast('Download error: ' + err.message, 'error');
    }
  };

  const isPdf = fileExt === 'pdf' || note.fileType === 'pdf';
  const isPptx = fileExt === 'pptx' || fileExt === 'ppt' || note.fileType === 'pptx';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(fileExt) || note.fileType === 'image';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-[#FCFBF8] border border-[#E8E7E2] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Document Header */}
        <div className="px-5 py-3.5 bg-white border-b border-[#E8E7E2] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] transition-colors"
              title="Back to Study Vault"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-[#1E2022] truncate">
                  {note.title}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#FCFBF8] border border-[#E8E7E2] text-[10px] font-mono font-semibold uppercase text-[#5A5E65]">
                  {fileExt}
                </span>
                {note.gdriveId && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#16A34A]">
                    <Cloud className="w-3 h-3" /> Google Drive
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#848A94] truncate">
                {subject ? `${subject.code} — ${subject.name}` : 'General Academic'} • {note.category.replace('_', ' ')} • {note.fileSize || '12 KB'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Download Original
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
              Done
            </Button>
          </div>
        </div>

        {/* Document Metadata Bar */}
        {note.description && (
          <div className="px-5 py-2 bg-[#FCFBF8] border-b border-[#E8E7E2] text-xs text-[#5A5E65] flex items-center justify-between">
            <p className="line-clamp-1">{note.description}</p>
            {note.tags.length > 0 && (
              <div className="hidden md:flex items-center gap-1 shrink-0 ml-4">
                <Tag className="w-3 h-3 text-[#848A94]" />
                {note.tags.slice(0, 4).map((t, idx) => (
                  <span key={idx} className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-[#E8E7E2] text-[#5A5E65]">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Document Viewer Body */}
        <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-[#F4F3EE]/50 flex flex-col items-center justify-center">
          {isPptx ? (
            <PptxViewer
              fileUrl={note.fileUrl}
              fileName={fileName}
              contentText={note.contentText}
              onClose={onClose}
              onDownload={handleDownload}
            />
          ) : isPdf ? (
            <PdfViewer
              fileUrl={note.fileUrl}
              fileName={fileName}
              contentText={note.contentText}
              onClose={onClose}
              onDownload={handleDownload}
            />
          ) : isImage && note.fileUrl ? (
            <div className="max-h-[600px] w-full flex items-center justify-center p-4 bg-white rounded-xl border border-[#E8E7E2] overflow-auto">
              <img
                src={note.fileUrl}
                alt={note.title}
                className="max-h-[540px] max-w-full object-contain rounded-lg shadow-xs"
              />
            </div>
          ) : (
            // Formatted Markdown / Lecture Note Viewer
            <div className="w-full h-[580px] bg-white rounded-xl border border-[#E8E7E2] p-6 overflow-y-auto font-mono text-xs text-[#1E2022] leading-relaxed whitespace-pre-wrap shadow-xs">
              {note.contentText || (
                <div className="p-8 text-center text-[#848A94] font-sans">
                  <FileText className="w-10 h-10 text-[#848A94] mx-auto mb-2" />
                  <p className="font-semibold text-sm text-[#1E2022]">{fileName}</p>
                  <p className="text-xs text-[#5A5E65] mt-1">Binary document attached. Ready for download or reading.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
