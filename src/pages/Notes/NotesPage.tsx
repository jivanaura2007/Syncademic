import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FolderOpen, 
  FileText, 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Eye, 
  Tag, 
  BookOpen, 
  ExternalLink,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  Presentation
} from 'lucide-react';
import { AppState, AcademicNote, NoteCategory, NoteFileType, Subject } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { DocumentViewerModal } from '../../components/documents/DocumentViewerModal';
import { addNote, updateNote, deleteNote } from '../../services/storage';
import { useToast } from '../../components/common/Toast';

interface NotesPageProps {
  state: AppState;
  onNavigateToAI?: () => void;
}

const CATEGORIES: { id: NoteCategory; label: string }[] = [
  { id: 'notes', label: 'Lecture Notes' },
  { id: 'assignments', label: 'Assignments & Solutions' },
  { id: 'presentations', label: 'Presentations & PPTs' },
  { id: 'pyqs', label: 'Past Question Papers (PYQs)' },
  { id: 'lab_manuals', label: 'Lab Manuals & Code' },
  { id: 'other', label: 'Other Study Materials' }
];

export const NotesPage: React.FC<NotesPageProps> = ({ state, onNavigateToAI }) => {
  const { showToast } = useToast();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Note Modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<AcademicNote | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState(state.subjects[0]?.id || '');
  const [formCategory, setFormCategory] = useState<NoteCategory>('notes');
  const [formFileType, setFormFileType] = useState<NoteFileType>('pdf');
  const [formDescription, setFormDescription] = useState('');
  const [formContentText, setFormContentText] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState('');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [isWrittenNote, setIsWrittenNote] = useState(false);

  // Preview Note Modal
  const [previewNote, setPreviewNote] = useState<AcademicNote | null>(null);

  // Delete note confirmation
  const [deletingNote, setDeletingNote] = useState<AcademicNote | null>(null);

  // Filter notes
  const filteredNotes = state.notes.filter((note) => {
    const matchesSubject = selectedSubjectId === 'all' || note.subjectId === selectedSubjectId;
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSubject && matchesCategory && matchesSearch;
  });

  const openAddNote = (written = false) => {
    setEditingNote(null);
    setIsWrittenNote(written);
    setFormTitle('');
    setFormSubjectId(state.subjects[0]?.id || '');
    setFormCategory('notes');
    setFormFileType(written ? 'text' : 'pdf');
    setFormDescription('');
    setFormContentText(written ? '# Lecture Notes\n\n- Key Concept:\n- Formula:\n' : '');
    setFormTags('');
    setFormFileName('');
    setFormFileSize('');
    setFormFileUrl('');
    setIsNoteModalOpen(true);
  };

  const openEditNote = (note: AcademicNote) => {
    setEditingNote(note);
    setIsWrittenNote(Boolean(note.isWrittenNote));
    setFormTitle(note.title);
    setFormSubjectId(note.subjectId);
    setFormCategory(note.category);
    setFormFileType(note.fileType);
    setFormDescription(note.description || '');
    setFormContentText(note.contentText || '');
    setFormTags(note.tags.join(', '));
    setFormFileName(note.fileName || '');
    setFormFileSize(note.fileSize || '');
    setFormFileUrl(note.fileUrl || '');
    setIsNoteModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormFileName(file.name);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFormFileSize(`${sizeInMB} MB`);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setFormFileType('pdf');
    else if (ext === 'ppt' || ext === 'pptx') setFormFileType('pptx');
    else if (ext === 'doc' || ext === 'docx') setFormFileType('docx');
    else if (ext === 'xls' || ext === 'xlsx') setFormFileType('xlsx');
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) setFormFileType('image');
    else setFormFileType('text');

    if (!formTitle) {
      setFormTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormFileUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    showToast(`Loaded file: ${file.name}`, 'info');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Title is required', 'warning');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (editingNote) {
      updateNote(editingNote.id, {
        title: formTitle.trim(),
        subjectId: formSubjectId,
        category: formCategory,
        fileType: formFileType,
        description: formDescription.trim() || undefined,
        contentText: formContentText || undefined,
        tags: tagsArray,
        fileName: formFileName || undefined,
        fileSize: formFileSize || undefined,
        fileUrl: formFileUrl || undefined,
        isWrittenNote
      });
      showToast('Updated note', 'success');
    } else {
      addNote({
        title: formTitle.trim(),
        subjectId: formSubjectId,
        semester: state.profile.semester,
        category: formCategory,
        fileType: formFileType,
        description: formDescription.trim() || undefined,
        contentText: formContentText || undefined,
        tags: tagsArray,
        fileName: formFileName || (isWrittenNote ? `${formTitle.trim().replace(/\s+/g, '_')}.md` : undefined),
        fileSize: formFileSize || (isWrittenNote ? '12 KB' : '1.5 MB'),
        fileUrl: formFileUrl || undefined,
        isWrittenNote
      });

      showToast('Added note to workspace', 'success');
    }

    setIsNoteModalOpen(false);
  };

  const handleDeleteNote = () => {
    if (!deletingNote) return;
    deleteNote(deletingNote.id);
    showToast('Note deleted', 'info');
    setDeletingNote(null);
  };

  const getFileIcon = (type: NoteFileType) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-[#D9381E]" />;
      case 'pptx':
        return <Presentation className="w-5 h-5 text-[#B7791F]" />;
      case 'xlsx':
        return <FileSpreadsheet className="w-5 h-5 text-[#1E7E34]" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-[#007FFF]" />;
      case 'text':
        return <FileCode className="w-5 h-5 text-[#5A5E65]" />;
      default:
        return <FileText className="w-5 h-5 text-[#5A5E65]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E7E2]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1E2022]">
              Smart Notes & Academic Files
            </h1>
            <Badge variant="neutral">Course Vault</Badge>
          </div>
          <p className="text-xs text-[#5A5E65] mt-1">
            Lecture notes, assignments, PYQs, and laboratory materials indexed by subject.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddNote(true)}
            leftIcon={<Edit className="w-3.5 h-3.5 text-[#007FFF]" />}
          >
            Write Note
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openAddNote(false)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Subject Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all ${
              selectedSubjectId === 'all'
                ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-xs'
                : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
            }`}
          >
            All Courses ({state.notes.length})
          </button>
          {state.subjects.map((sub) => {
            const count = state.notes.filter(n => n.subjectId === sub.id).length;
            const isSelected = selectedSubjectId === sub.id;

            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 border transition-all ${
                  isSelected
                    ? 'bg-[#1E2022] text-white border-[#1E2022] shadow-xs'
                    : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
                }`}
              >
                {sub.code} <span className="font-mono opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#848A94] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags, assignment solutions..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-[#E8E7E2] bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E7E2] bg-white focus:outline-hidden"
            >
              <option value="all">All Document Types</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-[#D5D3CB]">
          <FolderOpen className="w-10 h-10 text-[#848A94] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#1E2022]">No academic documents found</h3>
          <p className="text-xs text-[#5A5E65] mt-1 max-w-sm mx-auto">
            Upload PDFs, past question papers, or write lecture notes to keep your semester organized in Google Drive.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="primary" size="sm" onClick={() => openAddNote(false)}>
              Upload First File
            </Button>
            <Button variant="outline" size="sm" onClick={() => openAddNote(true)}>
              Write Note
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const subject = state.subjects.find(s => s.id === note.subjectId);

            return (
              <div
                key={note.id}
                className="p-4 rounded-xl bg-white border border-[#E8E7E2] hover:border-[#D5D3CB] transition-all flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div className="space-y-2.5">
                  {/* File Type & Course chip */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-[#F4F3EE] border border-[#E8E7E2]">
                        {getFileIcon(note.fileType)}
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold text-[#1E2022]">
                          {subject?.code || 'GEN'}
                        </span>
                        <span className="text-[10px] text-[#848A94] block uppercase">
                          {note.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewNote(note)}
                        className="p-1 text-[#848A94] hover:text-[#007FFF] rounded hover:bg-[#F4F3EE]"
                        title="View Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditNote(note)}
                        className="p-1 text-[#848A94] hover:text-[#1E2022] rounded hover:bg-[#F4F3EE]"
                        title="Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingNote(note)}
                        className="p-1 text-[#848A94] hover:text-[#D9381E] rounded hover:bg-[#FFF1F0]"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3
                      onClick={() => setPreviewNote(note)}
                      className="text-sm font-semibold text-[#1E2022] hover:text-[#007FFF] cursor-pointer line-clamp-1 tracking-tight"
                    >
                      {note.title}
                    </h3>
                    {note.description && (
                      <p className="text-xs text-[#5A5E65] line-clamp-2 mt-1 leading-relaxed">
                        {note.description}
                      </p>
                    )}
                  </div>

                  {/* Subject Folder Indicator */}
                  <div className="text-[10px] text-[#5A5E65] bg-[#FCFBF8] px-2 py-1 rounded border border-[#E8E7E2] flex items-center gap-1.5">
                    <FolderOpen className="w-3 h-3 text-[#B7791F] shrink-0" />
                    <span className="truncate">
                      Drive Folder: <strong className="text-[#1E2022]">[{subject?.code || 'GEN'}] {subject?.name || 'General Studies'}</strong>
                    </span>
                  </div>

                  {/* Tags */}
                  {note.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {note.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-[#FCFBF8] text-[#5A5E65] border border-[#E8E7E2]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer metadata & Actions */}
                <div className="pt-2.5 border-t border-[#E8E7E2] flex items-center justify-between text-[11px] text-[#848A94]">
                  <span>{note.fileSize || '1.2 MB'} • {note.createdAt}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewNote(note)}
                      className="font-medium text-[#007FFF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Featured In-App Document & Slide Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewNote)}
        onClose={() => setPreviewNote(null)}
        note={previewNote}
        subject={state.subjects.find(s => s.id === previewNote?.subjectId)}
      />

      {/* Add / Edit Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={editingNote ? 'Edit Document Details' : isWrittenNote ? 'Write Academic Note' : 'Upload Academic File'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Document Title</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Unit 2 AVL Trees & Balancing Rotations"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Associated Course (Timetable Subject)</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isWrittenNote ? (
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Upload File Document</label>
              <div className="p-4 rounded-xl border border-dashed border-[#D5D3CB] bg-[#FCFBF8] text-center hover:bg-[#F4F3EE] transition-colors cursor-pointer">
                <input
                  type="file"
                  id="note-file-input"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.md"
                />
                <label htmlFor="note-file-input" className="cursor-pointer block space-y-1">
                  <Upload className="w-6 h-6 text-[#848A94] mx-auto" />
                  <span className="text-xs font-semibold text-[#1E2022] block">
                    {formFileName ? `Selected: ${formFileName} (${formFileSize})` : 'Click or Drag to Upload PDF, PPT, DOCX, Image'}
                  </span>
                  <span className="text-[10px] text-[#848A94] block">Direct subject folder organization enabled</span>
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#1E2022] mb-1">Note Content (Markdown)</label>
              <textarea
                rows={8}
                value={formContentText}
                onChange={(e) => setFormContentText(e.target.value)}
                placeholder="# Lecture Summary&#10;&#10;Key derivations, algorithms, or formulas..."
                className="w-full font-mono text-xs p-3 rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Description / Summary (Optional)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief summary or topic keywords"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2022] mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              placeholder="trees, sorting, exam_prep, unit2"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E7E2]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {editingNote ? 'Save Changes' : 'Save & Sync Note'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingNote)}
        onClose={() => setDeletingNote(null)}
        onConfirm={handleDeleteNote}
        title="Delete Document"
        message={`Are you sure you want to remove "${deletingNote?.title}" from your academic workspace?`}
        confirmText="Delete Note"
        variant="danger"
      />
    </div>
  );
};
