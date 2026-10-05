import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Download, 
  Search, 
  Layers, 
  Presentation, 
  ZoomIn, 
  ZoomOut,
  RotateCcw,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '../common/Button';
import { parsePptx, PresentationData, SlideData } from '../../utils/pptxParser';

interface PptxViewerProps {
  fileUrl?: string;
  fileName?: string;
  contentText?: string;
  onClose?: () => void;
  onDownload?: () => void;
}

export const PptxViewer: React.FC<PptxViewerProps> = ({
  fileUrl,
  fileName = 'Presentation.pptx',
  contentText,
  onClose,
  onDownload
}) => {
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Load and parse PPTX
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadPptx = async () => {
      try {
        if (fileUrl) {
          const parsed = await parsePptx(fileUrl);
          if (isMounted) {
            setPresentation(parsed);
            setCurrentSlideIndex(0);
          }
        } else if (contentText) {
          // Parse structured slides from text
          const slideTexts = contentText.split(/---|\n## Slide \d+/i).filter(Boolean);
          const slides: SlideData[] = slideTexts.map((s, idx) => {
            const lines = s.trim().split('\n').filter(Boolean);
            const title = lines[0]?.replace(/^#+\s*/, '') || `Slide ${idx + 1}`;
            return {
              slideNumber: idx + 1,
              title,
              elements: lines.slice(1).map(l => ({
                type: l.startsWith('-') || l.startsWith('*') ? 'bullet' : 'paragraph',
                text: l.replace(/^[-*]\s*/, '')
              })),
              rawText: s
            };
          });

          if (isMounted) {
            setPresentation({
              fileName,
              totalSlides: slides.length || 1,
              slides: slides.length > 0 ? slides : [
                {
                  slideNumber: 1,
                  title: fileName.replace(/\.[^/.]+$/, ''),
                  elements: [{ type: 'paragraph', text: 'Slide presentation view ready.' }],
                  rawText: 'Slide presentation view'
                }
              ]
            });
            setCurrentSlideIndex(0);
          }
        } else {
          // Synthetic fallback
          if (isMounted) {
            setPresentation({
              fileName,
              totalSlides: 1,
              slides: [
                {
                  slideNumber: 1,
                  title: fileName.replace(/\.[^/.]+$/, ''),
                  elements: [{ type: 'paragraph', text: 'Presentation document preview ready.' }],
                  rawText: 'Presentation document preview ready.'
                }
              ]
            });
            setCurrentSlideIndex(0);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to preview this presentation. Try downloading the original PPTX.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPptx();
    return () => {
      isMounted = false;
    };
  }, [fileUrl, contentText, fileName]);

  const handleNextSlide = useCallback(() => {
    if (!presentation) return;
    setCurrentSlideIndex(prev => Math.min(presentation.slides.length - 1, prev + 1));
  }, [presentation]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        handleNextSlide();
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, isFullscreen]);

  const currentSlide = presentation?.slides[currentSlideIndex];

  // Search matches
  const filteredSlides = presentation?.slides.filter(s =>
    searchQuery === '' ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rawText.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className={`flex flex-col bg-[#FCFBF8] border border-[#E8E7E2] rounded-xl overflow-hidden transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'h-[650px] w-full'
    }`}>
      {/* Top Header & Navigation Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-[#E8E7E2] flex items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FFF8E6] text-[#B7791F] flex items-center justify-center shrink-0 border border-[#FADBD8]/30">
            <Presentation className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#1E2022] truncate text-xs sm:text-sm">{fileName}</h3>
            <span className="text-[11px] text-[#848A94]">
              {presentation ? `Slide ${currentSlideIndex + 1} of ${presentation.totalSlides}` : 'Loading slides...'}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Search Box */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-[#848A94] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search slides..."
              className="w-32 lg:w-40 pl-7 pr-2 py-1 text-[11px] rounded-md border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
            />
          </div>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-md border text-[11px] flex items-center gap-1 transition-colors ${
              showThumbnails ? 'bg-[#1E2022] text-white border-[#1E2022]' : 'bg-white text-[#5A5E65] border-[#E8E7E2] hover:bg-[#F4F3EE]'
            }`}
            title="Toggle Slide Thumbnails"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Slides</span>
          </button>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 px-1 py-0.5 rounded-md bg-[#F4F3EE] border border-[#E8E7E2]">
            <button
              onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
              className="p-1 text-[#5A5E65] hover:text-[#1E2022]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono w-8 text-center text-[#5A5E65]">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
              className="p-1 text-[#5A5E65] hover:text-[#1E2022]"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 text-[#848A94] hover:text-[#1E2022]"
              title="Reset Zoom"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Fullscreen button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] rounded-md border border-[#E8E7E2]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Download Original File */}
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              leftIcon={<Download className="w-3 h-3" />}
              className="text-xs"
            >
              <span className="hidden sm:inline">Original PPTX</span>
            </Button>
          )}

          {onClose && (
            <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Slide Viewer Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        {showThumbnails && presentation && (
          <div className="w-48 sm:w-56 bg-white border-r border-[#E8E7E2] overflow-y-auto p-3 space-y-2 shrink-0">
            <div className="text-[11px] font-semibold text-[#848A94] uppercase tracking-wider px-1 mb-2">
              Slides ({presentation.slides.length})
            </div>
            {presentation.slides.map((slide, idx) => {
              const isSelected = idx === currentSlideIndex;
              const matchesSearch = searchQuery === '' || slide.title.toLowerCase().includes(searchQuery.toLowerCase()) || slide.rawText.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesSearch) return null;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-full text-left p-2 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#EBF5FF] border-[#007FFF] text-[#007FFF] font-semibold shadow-xs'
                      : 'bg-[#FCFBF8] border-[#E8E7E2] text-[#5A5E65] hover:bg-[#F4F3EE]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold">Slide {slide.slideNumber}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#007FFF]" />}
                  </div>
                  <div className="truncate text-xs text-[#1E2022] font-medium">{slide.title || `Slide ${slide.slideNumber}`}</div>
                  <div className="text-[10px] text-[#848A94] line-clamp-1">{slide.rawText.slice(0, 40)}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Center Presentation Stage */}
        <div className="flex-1 bg-[#F4F3EE] overflow-auto flex flex-col items-center justify-center p-4 sm:p-8 relative">
          {isLoading ? (
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#007FFF] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#5A5E65]">Parsing presentation slides...</p>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 bg-white rounded-xl border border-[#FADBD8] text-center space-y-3 shadow-xs">
              <AlertCircle className="w-10 h-10 text-[#D9381E] mx-auto" />
              <h4 className="text-sm font-semibold text-[#1E2022]">Unable to render presentation</h4>
              <p className="text-xs text-[#5A5E65]">{error}</p>
              {onDownload && (
                <Button variant="primary" size="sm" onClick={onDownload} leftIcon={<Download className="w-3.5 h-3.5" />}>
                  Download Original PPTX
                </Button>
              )}
            </div>
          ) : currentSlide ? (
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              className="w-full max-w-3xl aspect-[16/10] bg-white rounded-xl border border-[#E8E7E2] shadow-md p-8 sm:p-12 flex flex-col justify-between transition-transform duration-150"
            >
              {/* Slide Header / Title */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E7E2] mb-6">
                  <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#848A94]">
                    Syncademic Study Slide #{currentSlide.slideNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#FCFBF8] border border-[#E8E7E2] text-[10px] text-[#5A5E65]">
                    {currentSlideIndex + 1} / {presentation?.totalSlides}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-[#1E2022] tracking-tight mb-6">
                  {currentSlide.title}
                </h2>

                {/* Slide Elements (Bullets, Paragraphs, Headings, Tables) */}
                <div className="space-y-3.5 text-xs sm:text-sm text-[#1E2022] leading-relaxed max-h-[300px] overflow-y-auto pr-2">
                  {currentSlide.elements.map((elem, eIdx) => {
                    if (elem.type === 'title') return null; // Already rendered as H2
                    if (elem.type === 'heading') {
                      return (
                        <h4 key={eIdx} className="font-semibold text-sm text-[#007FFF] pt-1">
                          {elem.text}
                        </h4>
                      );
                    }
                    if (elem.type === 'bullet') {
                      return (
                        <div key={eIdx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#007FFF] mt-2 shrink-0" />
                          <span>{elem.text}</span>
                        </div>
                      );
                    }
                    if (elem.type === 'table' && elem.rows) {
                      return (
                        <div key={eIdx} className="overflow-x-auto my-2 rounded-lg border border-[#E8E7E2]">
                          <table className="w-full text-xs text-left">
                            <tbody>
                              {elem.rows.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx === 0 ? 'bg-[#FCFBF8] font-bold border-b border-[#E8E7E2]' : 'border-b border-[#E8E7E2]'}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2 border-r border-[#E8E7E2] last:border-r-0">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                    return (
                      <p key={eIdx} className="text-[#5A5E65]">
                        {elem.text}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Slide Footer */}
              <div className="pt-4 border-t border-[#E8E7E2] flex items-center justify-between text-[10px] text-[#848A94]">
                <span>{fileName}</span>
                <span>Press Space or Arrow keys to navigate</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Floating Navigation Bar */}
      {presentation && (
        <div className="px-4 py-2 bg-white border-t border-[#E8E7E2] flex items-center justify-between text-xs shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevSlide}
            disabled={currentSlideIndex === 0}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous Slide
          </Button>

          {/* Slide dots / pagination indicator */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] sm:max-w-md px-2">
            {presentation.slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlideIndex ? 'w-6 bg-[#007FFF]' : 'w-2 bg-[#E8E7E2] hover:bg-[#848A94]'
                }`}
                title={`Jump to Slide ${idx + 1}`}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNextSlide}
            disabled={currentSlideIndex === presentation.slides.length - 1}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next Slide
          </Button>
        </div>
      )}
    </div>
  );
};
