import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  FileText,
  AlertCircle,
  Printer,
  Search,
  Layout,
  RefreshCw,
  Columns,
  Check,
  Lock,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';

// Configure PDF.js worker
try {
  // Use official unpkg ESM worker matched to installed version or fallback
  const pdfjsVersion = (pdfjsLib as any).version || '4.10.38';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

interface PdfViewerProps {
  fileUrl?: string;
  fileName?: string;
  contentText?: string;
  authHeader?: string;
  onClose?: () => void;
  onDownload?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  fileName = 'Academic_Document.pdf',
  contentText,
  authHeader,
  onClose,
  onDownload
}) => {
  const { showToast } = useToast();

  // Document state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'custom' | 'width' | 'page'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  
  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [renderedText, setRenderedText] = useState<string>('');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, []);

  // Convert input prop to uint8array/url for pdfjs
  const loadDocument = useCallback(async (password?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsPasswordProtected(false);
    setLoadingProgress(10);

    try {
      let loadingTask: any;

      if (fileUrl) {
        if (fileUrl.startsWith('data:application/pdf') || fileUrl.startsWith('data:')) {
          // Convert base64 data URL to Uint8Array
          const base64Data = fileUrl.split(',')[1];
          const raw = atob(base64Data);
          const uint8Array = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            uint8Array[i] = raw.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            password: password || undefined,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true
          });
        } else {
          // HTTP / HTTPS URL
          const params: any = {
            url: fileUrl,
            withCredentials: true,
            password: password || undefined,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
            cMapPacked: true
          };

          // File authorization header support
          if (authHeader) {
            params.httpHeaders = {
              Authorization: authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`
            };
          }

          loadingTask = pdfjsLib.getDocument(params);
        }
      } else if (contentText) {
        // Fallback for markdown/text notes in PDF viewer
        setRenderedText(contentText);
        setIsLoading(false);
        return;
      } else {
        // Fallback sample view
        setRenderedText(`# ${fileName}\n\nSyncademic Academic Document Viewer.\nBinary PDF file ready for study and review.`);
        setIsLoading(false);
        return;
      }

      // Progress reporting
      loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
        if (progressData.total > 0) {
          const percent = Math.round((progressData.loaded / progressData.total) * 100);
          setLoadingProgress(percent);
        }
      };

      // Password callback
      loadingTask.onPassword = (callback: Function, reason: number) => {
        setIsPasswordProtected(true);
        setIsLoading(false);
        if (password) {
          callback(password);
        }
      };

      const doc = await loadingTask.promise;
      if (!isMountedRef.current) return;

      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setPageInput('1');
      setIsLoading(false);
      setLoadingProgress(100);

      // Generate thumbnails asynchronously
      generateThumbnails(doc);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.error('Error loading PDF document:', err);
      if (err.name === 'PasswordException') {
        setIsPasswordProtected(true);
        setIsLoading(false);
      } else {
        setErrorMessage(
          err.message || 'Failed to load PDF document. Please verify the file format or permissions.'
        );
        setIsLoading(false);
      }
    }
  }, [fileUrl, contentText, authHeader, fileName]);

  // Generate page thumbnails
  const generateThumbnails = async (doc: any) => {
    try {
      const thumbs: string[] = [];
      const totalToGen = Math.min(doc.numPages, 20); // Cap for fast responsiveness
      
      for (let i = 1; i <= totalToGen; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
      }
      if (isMountedRef.current) {
        setThumbnails(thumbs);
      }
    } catch (err) {
      console.warn('Could not generate PDF thumbnails:', err);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Render current page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    try {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      const page = await pdfDoc.getPage(currentPage);
      if (!isMountedRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Base unscaled viewport
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      const containerHeight = containerRef.current.clientHeight - 48;

      let effectiveScale = scale;
      if (fitMode === 'width') {
        effectiveScale = Math.max(0.4, (containerWidth / unscaledViewport.width) * 0.96);
      } else if (fitMode === 'page') {
        const scaleW = (containerWidth / unscaledViewport.width) * 0.95;
        const scaleH = (containerHeight / unscaledViewport.height) * 0.95;
        effectiveScale = Math.max(0.4, Math.min(scaleW, scaleH));
      }

      // Crisp Retina / High-DPI support
      const pixelRatio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: effectiveScale * pixelRatio, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / pixelRatio}px`;
      canvas.style.height = `${viewport.height / pixelRatio}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    }
  }, [pdfDoc, currentPage, scale, fitMode, rotation]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle window resize for fit modes
  useEffect(() => {
    const handleResize = () => {
      if (fitMode !== 'custom') {
        renderCurrentPage();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitMode, renderCurrentPage]);

  // Navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      setPageInput(p.toString());
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      setPageInput(p.toString());
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setFitMode('custom');
    setScale(prev => Math.min(3.0, Math.round((prev + 0.2) * 10) / 10));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setScale(prev => Math.max(0.4, Math.round((prev - 0.2) * 10) / 10));
  };

  const handleFitToWidth = () => {
    setFitMode('width');
  };

  const handleFitToPage = () => {
    setFitMode('page');
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUnlockPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim()) {
      loadDocument(passwordInput.trim());
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#FCFBF8] border border-[#E8E7E2] rounded-xl overflow-hidden transition-all select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'h-[680px] w-full'
      }`}
    >
      {/* Top Header & Integrated Toolbar */}
      <div className="px-4 py-2.5 bg-white border-b border-[#E8E7E2] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 shadow-xs">
        {/* Document identity & thumbnail toggle */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showThumbnails
                ? 'bg-[#007FFF]/10 border-[#007FFF]/30 text-[#007FFF]'
                : 'border-[#E8E7E2] text-[#5A5E65] hover:bg-[#F4F3EE]'
            }`}
            title="Toggle Thumbnails Panel"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          <div className="w-7 h-7 rounded-lg bg-[#FFF1F0] text-[#D9381E] flex items-center justify-center shrink-0 border border-[#FADBD8]">
            <FileText className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-[#1E2022] truncate text-xs max-w-[200px] sm:max-w-xs md:max-w-md">
              {fileName}
            </h3>
            <span className="text-[10px] text-[#848A94]">
              {numPages > 0 ? `${numPages} Pages • Verified PDF Engine` : 'Academic Document'}
            </span>
          </div>
        </div>

        {/* Central Controls: Page Navigation & Zoom Tools */}
        {numPages > 0 && (
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#F4F3EE] border border-[#E8E7E2]">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded text-[#5A5E65] hover:text-[#1E2022] disabled:opacity-40 transition-colors"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onBlur={() => setPageInput(currentPage.toString())}
                  className="w-8 py-0.5 text-center font-mono font-semibold text-xs bg-white rounded border border-[#E8E7E2] focus:outline-hidden"
                />
                <span className="text-[11px] text-[#848A94]">/ {numPages}</span>
              </form>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                className="p-1 rounded text-[#5A5E65] hover:text-[#1E2022] disabled:opacity-40 transition-colors"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom & Fit Tools */}
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[#F4F3EE] border border-[#E8E7E2]">
              <button
                onClick={handleZoomOut}
                className="p-1 text-[#5A5E65] hover:text-[#1E2022]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-mono font-medium w-12 text-center text-[#1E2022]">
                {fitMode === 'width' ? 'Fit W' : fitMode === 'page' ? 'Fit Page' : `${Math.round(scale * 100)}%`}
              </span>

              <button
                onClick={handleZoomIn}
                className="p-1 text-[#5A5E65] hover:text-[#1E2022]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-3.5 bg-[#E8E7E2] mx-0.5" />

              <button
                onClick={handleFitToWidth}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  fitMode === 'width' ? 'bg-white text-[#007FFF] shadow-2xs' : 'text-[#5A5E65] hover:text-[#1E2022]'
                }`}
                title="Fit to Container Width"
              >
                Width
              </button>

              <button
                onClick={handleFitToPage}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  fitMode === 'page' ? 'bg-white text-[#007FFF] shadow-2xs' : 'text-[#5A5E65] hover:text-[#1E2022]'
                }`}
                title="Fit Entire Page"
              >
                Page
              </button>
            </div>
          </div>
        )}

        {/* Right Tools: Rotate, Fullscreen, Print & Actions */}
        <div className="flex items-center gap-1.5">
          {numPages > 0 && (
            <>
              <button
                onClick={handleRotate}
                className="p-1.5 text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E7E2]"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handlePrint}
                className="p-1.5 text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E7E2] hidden md:flex items-center"
                title="Print PDF"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E7E2]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}

          {onClose && (
            <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Canvas & Content Area */}
      <div className="flex-1 flex overflow-hidden bg-[#525659] relative">
        {/* Left Thumbnail Drawer */}
        {showThumbnails && numPages > 0 && (
          <div className="w-44 bg-[#323639] border-r border-[#404448] overflow-y-auto p-3 space-y-3 shrink-0 scrollbar-thin">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A4A8] mb-1">
              Pages ({numPages})
            </div>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(p => (
              <div
                key={p}
                onClick={() => {
                  setCurrentPage(p);
                  setPageInput(p.toString());
                }}
                className={`cursor-pointer group flex flex-col items-center p-1.5 rounded-lg transition-all ${
                  currentPage === p
                    ? 'bg-[#007FFF] text-white shadow-md'
                    : 'bg-[#222426] text-[#A0A4A8] hover:bg-[#2A2C2E]'
                }`}
              >
                {thumbnails[p - 1] ? (
                  <img
                    src={thumbnails[p - 1]}
                    alt={`Page ${p}`}
                    className="w-full h-auto rounded-sm border border-black/20 shadow-xs mb-1"
                  />
                ) : (
                  <div className="w-full h-24 bg-[#1E2022] rounded flex items-center justify-center text-[11px] mb-1">
                    {p}
                  </div>
                )}
                <span className="text-[10px] font-mono font-medium">Page {p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Center PDF View Container */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center relative select-text"
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center space-y-3 p-6 bg-white/95 rounded-2xl shadow-xl border border-[#E8E7E2] max-w-xs animate-in fade-in">
              <div className="w-8 h-8 border-2 border-[#007FFF] border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <p className="text-xs font-semibold text-[#1E2022]">Loading Academic Document</p>
                <p className="text-[11px] text-[#5A5E65] mt-0.5">
                  {loadingProgress > 0 ? `Buffering ${loadingProgress}%` : 'Parsing PDF streams...'}
                </p>
              </div>
              <div className="w-full bg-[#F4F3EE] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#007FFF] h-full transition-all duration-200"
                  style={{ width: `${Math.max(15, loadingProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Password Protection Dialog */}
          {isPasswordProtected && (
            <div className="max-w-sm w-full p-6 bg-white rounded-2xl border border-[#E8E7E2] text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-[#FFF1F0] text-[#D9381E] flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1E2022]">Protected Document</h4>
                <p className="text-xs text-[#5A5E65] mt-1">
                  This academic PDF requires an encryption password to view.
                </p>
              </div>
              <form onSubmit={handleUnlockPassword} className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter PDF password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E8E7E2] bg-[#FCFBF8] focus:bg-white focus:outline-hidden"
                  autoFocus
                />
                <Button variant="primary" size="sm" type="submit" className="w-full">
                  Unlock Document
                </Button>
              </form>
            </div>
          )}

          {/* Error View */}
          {errorMessage && (
            <div className="max-w-md p-6 bg-white rounded-2xl border border-[#FADBD8] text-center space-y-3.5 shadow-2xl animate-in zoom-in-95">
              <AlertCircle className="w-10 h-10 text-[#D9381E] mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-[#1E2022]">Document Preview Unavailable</h4>
                <p className="text-xs text-[#5A5E65] mt-1 leading-relaxed">{errorMessage}</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDocument()}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry Loading
                </Button>
                {onDownload && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onDownload}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download File
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Formatted Text Note Fallback */}
          {renderedText && !isLoading && !errorMessage && (
            <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#E8E7E2] p-8 overflow-y-auto max-h-[580px] font-mono text-xs text-[#1E2022] leading-relaxed whitespace-pre-wrap">
              {renderedText}
            </div>
          )}

          {/* Real PDF Canvas Renderer */}
          <div
            className={`transition-opacity duration-150 flex items-center justify-center ${
              isLoading || errorMessage || isPasswordProtected || renderedText ? 'hidden' : 'block'
            }`}
          >
            <canvas
              ref={canvasRef}
              className="rounded-lg shadow-2xl bg-white transition-all max-w-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
