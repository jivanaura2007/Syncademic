import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCw, 
  X, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Upload, 
  SwitchCamera, 
  Maximize2,
  Clock,
  Sun,
  BookOpen,
  Calendar,
  Layers
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';
import { api } from '../../services/api';

interface DocumentCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scanData: {
    photoBase64: string;
    mimeType: string;
    fileName: string;
    targetCategory: 'timetable' | 'calendar' | 'notes' | 'all';
    extractionResult: any;
  }) => void;
  initialCategory?: 'timetable' | 'calendar' | 'notes' | 'all';
}

export const DocumentCameraScannerModal: React.FC<DocumentCameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  initialCategory = 'timetable'
}) => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileFallbackRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [targetCategory, setTargetCategory] = useState<'timetable' | 'calendar' | 'notes' | 'all'>(initialCategory);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Stop camera tracks cleanly
  const stopCameraStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }
  };

  // Check available video devices
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else if (!isOpen) {
      stopCameraStream();
      setCapturedPhoto(null);
      setCameraError(null);
      setIsProcessingAI(false);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCameraStream();
    setCameraError(null);
    setIsInitializing(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please upload a photo instead.');
      setIsInitializing(false);
      return;
    }

    try {
      // Prefer high resolution for reading timetable text
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        // Fallback to basic video without resolution constraints
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(e => console.warn('Video play notice:', e));
      }
    } catch (err: any) {
      console.warn('Camera permission/access issue:', err);
      let errorMsg = 'Could not access device camera. Please grant camera permission or upload a photo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings to scan documents.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system. You can upload an image file instead.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is currently in use by another application. Please close other camera apps and retry.';
      }
      setCameraError(errorMsg);
    } finally {
      setIsInitializing(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      showToast('Could not capture frame from camera', 'error');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);

    // Stop video stream after capture to conserve power
    stopCameraStream();
    showToast('Photo captured! Ready for Gemini AI processing.', 'success');
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleProcessScanWithAI = async () => {
    if (!capturedPhoto) return;

    setIsProcessingAI(true);
    const base64Data = capturedPhoto.replace(/^data:[^,]+,/, '');

    const documentName = targetCategory === 'timetable'
      ? 'Timetable_Camera_Scan.jpg'
      : targetCategory === 'calendar'
      ? 'Academic_Calendar_Scan.jpg'
      : 'Document_Camera_Scan.jpg';

    try {
      // Call multimodal extraction API
      const result = await api.ai.extractDetails({
        fileBase64: base64Data,
        mimeType: 'image/jpeg',
        fileName: documentName,
        targetCategory
      });

      onScanSuccess({
        photoBase64: base64Data,
        mimeType: 'image/jpeg',
        fileName: documentName,
        targetCategory,
        extractionResult: result
      });

      showToast('Document parsed successfully with Gemini AI!', 'success');
      onClose();
    } catch (err: any) {
      console.error('Document scan extraction error:', err);
      showToast(`Scan extraction failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhoto(dataUrl);
      setCameraError(null);
      stopCameraStream();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#1E2022] text-white border border-white/10 rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-black/40 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#007FFF]/20 border border-[#007FFF]/40 text-[#007FFF] flex items-center justify-center">
              <Camera className="w-4 h-4 text-[#007FFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Document Scanner
                </h3>
                <Badge variant="blue">Gemini 3.8 Flash</Badge>
              </div>
              <p className="text-[11px] text-white/60">
                Capture photos of timetables, circulars, or schedules for instant AI parsing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Selector */}
        <div className="px-5 py-2.5 bg-black/20 border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider shrink-0">
            Target:
          </span>

          <button
            type="button"
            onClick={() => setTargetCategory('timetable')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              targetCategory === 'timetable'
                ? 'bg-[#007FFF] text-white font-semibold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <Clock className="w-3 h-3" />
            Timetable Schedule
          </button>

          <button
            type="button"
            onClick={() => setTargetCategory('calendar')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              targetCategory === 'calendar'
                ? 'bg-[#F59E0B] text-black font-semibold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <Sun className="w-3 h-3" />
            Holidays & Calendar
          </button>

          <button
            type="button"
            onClick={() => setTargetCategory('notes')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              targetCategory === 'notes'
                ? 'bg-[#9333EA] text-white font-semibold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Lecture Notes & Syllabus
          </button>

          <button
            type="button"
            onClick={() => setTargetCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              targetCategory === 'all'
                ? 'bg-white text-[#1E2022] font-semibold shadow-xs'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            <Layers className="w-3 h-3" />
            All Details
          </button>
        </div>

        {/* Viewfinder / Capture Canvas Container */}
        <div className="relative flex-1 bg-black min-h-[340px] max-h-[460px] flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            /* Frozen Snapshot Preview */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPhoto}
                alt="Captured Document"
                className="max-h-[420px] max-w-full object-contain rounded-lg shadow-lg"
              />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs text-white/90 flex items-center gap-1.5 border border-white/20">
                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                Snapshot Ready
              </div>
            </div>
          ) : cameraError ? (
            /* Camera Error / Permission Fallback View */
            <div className="p-8 text-center max-w-md space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-white">Camera Access Required</h4>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">{cameraError}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto text-xs border-white/20 text-white hover:bg-white/10"
                >
                  Retry Camera
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileFallbackRef.current?.click()}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto text-xs"
                >
                  Upload Image Instead
                </Button>
              </div>
            </div>
          ) : (
            /* Live Camera Stream with Viewfinder Guides */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[440px]"
              />

              {/* Viewfinder Target Reticle Overlay */}
              <div className="absolute inset-6 sm:inset-10 border-2 border-white/30 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                {/* Corner Accents */}
                <div className="flex justify-between">
                  <div className="w-6 h-6 border-t-3 border-l-3 border-[#007FFF] -mt-1 -ml-1 rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-3 border-r-3 border-[#007FFF] -mt-1 -mr-1 rounded-tr-sm" />
                </div>

                {/* Center Guideline */}
                <div className="text-center bg-black/60 backdrop-blur-xs py-1.5 px-3 rounded-full mx-auto border border-white/15 max-w-xs">
                  <p className="text-[11px] text-white/90 font-medium">
                    Align schedule or circular inside frame
                  </p>
                </div>

                <div className="flex justify-between">
                  <div className="w-6 h-6 border-b-3 border-l-3 border-[#007FFF] -mb-1 -ml-1 rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-3 border-r-3 border-[#007FFF] -mb-1 -mr-1 rounded-br-sm" />
                </div>
              </div>

              {/* Camera Switch Button if multiple cameras available */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 border border-white/20 transition-all cursor-pointer shadow-md"
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden Fallback File Input */}
          <input
            ref={fileFallbackRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFileSelect}
            className="hidden"
          />
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-black/50 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div>
            {!capturedPhoto ? (
              <button
                type="button"
                onClick={() => fileFallbackRef.current?.click()}
                className="text-xs text-white/60 hover:text-white underline flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from gallery</span>
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetake}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                disabled={isProcessingAI}
                className="text-xs border-white/20 text-white hover:bg-white/10"
              >
                Retake Photo
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!capturedPhoto ? (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={Boolean(cameraError) || isInitializing}
                className="w-14 h-14 rounded-full bg-white text-[#1E2022] hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center shadow-lg border-4 border-white/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Take Photo"
              >
                <div className="w-10 h-10 rounded-full bg-[#007FFF] flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
              </button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleProcessScanWithAI}
                isLoading={isProcessingAI}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-[#007FFF] hover:bg-[#0066CC] font-semibold text-xs sm:text-sm px-5"
              >
                {isProcessingAI ? 'Parsing with Gemini AI...' : 'Parse with Gemini AI'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
