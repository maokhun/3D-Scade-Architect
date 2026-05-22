import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Cpu, 
  Play, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  X, 
  AlertCircle, 
  Sliders, 
  Maximize2,
  BoxSelect,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { geminiService, DetectedObject } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface VisionWorkspaceProps {
  language: 'en' | 'km';
  theme: 'dark' | 'light';
  onExtractModel: (prompt: string, dimensions?: { width: number, depth: number, height: number }) => void;
  isLoadingGlobal: boolean;
}

export function VisionWorkspace({ language, theme, onExtractModel, isLoadingGlobal }: VisionWorkspaceProps) {
  const [sourceMode, setSourceMode] = useState<'upload' | 'camera'>('upload');
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      // Attempt 1: Optimal rear camera with ideal HD resolution
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStream(stream);
    } catch (err: any) {
      console.warn("First camera access attempt failed (with environment facingMode):", err);
      try {
        // Attempt 2: Fallback to general camera with ideal HD resolution (without facingMode constraint)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraStream(stream);
      } catch (err2: any) {
        console.warn("Second camera access attempt failed (generic video resolution):", err2);
        try {
          // Attempt 3: Maximum fallback - try any raw video stream that the browser can provide
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraStream(stream);
        } catch (err3: any) {
          console.error("All camera access attempts failed:", err3);
          setCameraError(
            language === 'km' 
              ? "មិនអាចបើកកាមេរ៉ាបានទេ! សូមពិនិត្យមើលសិទ្ធិអនុញ្ញាតកាមេរ៉ា។ (" + (err3.message || "Starting videoinput failed") + ")"
              : `Could not access webcam (${err3.message || "Starting videoinput failed"}). Please ensure camera permissions are granted in your browser.`
          );
        }
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setActiveImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setActiveImage(reader.result as string);
        setDetectedObjects([]);
        setDetectError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setActiveImage(reader.result as string);
        setDetectedObjects([]);
        setDetectError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runDetection = async () => {
    if (!activeImage) return;
    setIsDetecting(true);
    setDetectError(null);
    setDetectedObjects([]);

    try {
      const commaIndex = activeImage.indexOf(',');
      const base64Data = activeImage.substring(commaIndex + 1);
      const mimeType = activeImage.substring(5, activeImage.indexOf(';'));

      const response = await geminiService.detectObjects(base64Data, mimeType);
      
      if (response && response.objects) {
        setDetectedObjects(response.objects);
        if (response.objects.length === 0) {
          setDetectError(
            language === 'km'
              ? "មិនមានវត្ថុ 3D ត្រូវបានរកឃើញនៅក្នុងរូបភាពនេះទេ។ សូមព្យាយាមប្រើរូបភាពផ្សេងទៀត។"
              : "No distinct engineering objects identified in the image. Try another picture with sharper geometries or clear focal parts."
          );
        }
      } else {
        throw new Error("Invalid response schema received from Vision API");
      }
    } catch (err: any) {
      console.error("AI Detection error:", err);
      setDetectError(
        language === 'km'
          ? `ការផ្ទៀងផ្ទាត់រូបភាពបរាជ័យ៖ ${err.message || 'បញ្ហាបណ្តាញ'}`
          : `Vision Analysis Failed: ${err.message || 'Check your Gemini configurations.'}`
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleExtract = (obj: DetectedObject) => {
    const dimensionsText = `[Physical Scale: ${obj.dimensions.width}mm width x ${obj.dimensions.depth}mm depth x ${obj.dimensions.height}mm height]`;
    const promptWithSpecs = `${obj.extractionPrompt}\n\nStrict Constraints:\n- Parametric Model variables at the top of the design.\n- Wall and structure thickness adjusted according to dimension constraints: ${dimensionsText}.\n- Provide complete, printable manifold OpenSCAD and exported JSCAD code.`;
    
    onExtractModel(promptWithSpecs, obj.dimensions);
  };

  const t = {
    title: language === 'km' ? 'ប្រព័ន្ធវិភាគរូបភាព និងស្វែងរកវត្ថុ 3D' : 'Vision Object Detecor & Extractor',
    subtitle: language === 'km' 
      ? 'បញ្ចូលរូបភាព ឬប្រើកាមេរ៉ាដើម្បីស្កេន និងបង្កើតវត្ថុ 3D ពិតៗចេញពីពិភពខាងក្រៅ' 
      : 'Analyze images or camera feeds to identify parts, estimate scales, and generate parametric designs.',
    modeUpload: language === 'km' ? 'បញ្ចូលរូបភាព' : 'File Upload',
    modeCamera: language === 'km' ? 'ស្កេនតាមកាមេរ៉ា' : 'Live Camera',
    placeholderDrag: language === 'km' ? 'អូសរូបភាពចូលទីនេះ ឬ ចុចដើម្បីជ្រើសរើស' : 'Drag & drop image here or click to browse',
    startCam: language === 'km' ? 'បើកកាមេរ៉ា' : 'Start Feed',
    stopCam: language === 'km' ? 'បិទកាមេរ៉ា' : 'Stop Feed',
    capture: language === 'km' ? 'ថតរូបភាព' : 'Capture Frame',
    detectBtn: language === 'km' ? 'ស្កេនស្វែងរកវត្ថុ 3D' : 'Analyze & Detect Objects',
    detecting: language === 'km' ? 'កំពុងវិភាគវត្ថុជាមួយ Vision AI...' : 'Analyzing with Vision AI...',
    noObjects: language === 'km' ? 'មិនទាន់មានវត្ថុដែលបានវិភាគនៅឡើយទេ' : 'No objects detected yet. Press "Analyze & Detect Objects" above.',
    extractBtn: language === 'km' ? 'បង្កើតជាម៉ូដែល 3D' : 'Extract & Build 3D',
    dimensionsLabel: language === 'km' ? 'ទំហំប៉ាន់ស្មាន (មម):' : 'Estimated Dimensions (mm):',
    confidenceHint: language === 'km' ? 'ការប៉ាន់ស្មានទំហំដោយផ្អែកលើមាត្រដ្ឋានរូបភាព' : 'Scales estimated using visual reference objects.',
    description: language === 'km' ? 'លក្ខណៈបច្ចេកទេស' : 'Description',
    extractionPrompt: language === 'km' ? 'គំរូនៃរចនាសម្ព័ន្ធ' : 'Extraction Prompt Template',
    uploadAnother: language === 'km' ? 'ប្តូររូបភាពថ្មី' : 'Reset / Upload New',
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text-dim relative p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full pb-32 flex flex-col gap-6">
        
        {/* Main Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-app-surface border border-app-border">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <Cpu className="w-8 h-8 animate-pulse text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-app-text uppercase">{t.title}</h2>
              <p className="text-sm text-app-text-muted mt-1 leading-relaxed">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-app-bg p-1 rounded-lg border border-app-border self-start md:self-center">
            <button
              onClick={() => { setSourceMode('upload'); stopCamera(); }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${sourceMode === 'upload' ? 'bg-[#3b82f6] text-white shadow' : 'text-app-text-muted hover:text-white'}`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5" />
              {t.modeUpload}
            </button>
            <button
              onClick={() => { setSourceMode('camera'); startCamera(); }}
              className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all ${sourceMode === 'camera' ? 'bg-[#3b82f6] text-white shadow' : 'text-app-text-muted hover:text-white'}`}
            >
              <Camera className="w-3.5 h-3.5 inline mr-1.5" />
              {t.modeCamera}
            </button>
          </div>
        </div>

        {/* Workspace Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Image source OR webcam */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-app-surface border border-app-border rounded-2xl overflow-hidden shadow-xl aspect-video md:aspect-[4/3] flex flex-col justify-center items-center relative">
              
              {/* CAMERA INTERFACE */}
              {sourceMode === 'camera' && !activeImage && (
                <div className="w-full h-full flex flex-col justify-between p-4 bg-black">
                  {cameraError ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-red-400 gap-3">
                      <AlertCircle className="w-12 h-12" />
                      <p className="text-sm font-semibold max-w-sm leading-relaxed">{cameraError}</p>
                      <button 
                        onClick={startCamera}
                        className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-xs font-black uppercase transition-all"
                      >
                        Retry Access
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-neutral-950">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover scale-x-[-1]" // mirror effect
                      />
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-full text-[10px] text-green-400 font-bold tracking-wider uppercase border border-green-400/20 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Live Frame Feed
                      </div>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-32 h-32 border border-white/25 rounded-md relative opacity-50">
                          <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-white" />
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-white" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-white" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 mt-4">
                    {cameraStream ? (
                      <>
                        <button
                          onClick={handleCapture}
                          className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {t.capture}
                        </button>
                        <button
                          onClick={stopCamera}
                          className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          {t.stopCam}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#3b82f6]/95 text-white font-bold text-xs uppercase tracking-wider transition-all"
                      >
                        {t.startCam}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* UPLOAD / DROP DRAG INTERFACE */}
              {sourceMode === 'upload' && !activeImage && (
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center p-8 transition-colors cursor-pointer ${isDragging ? 'bg-blue-500/5 border-2 border-dashed border-[#3b82f6]' : 'bg-transparent border border-transparent'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                  <div className="p-4 rounded-full bg-blue-500/5 text-blue-400 border border-blue-500/10 mb-4 hover:scale-[1.05] transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-semibold text-app-text text-center">{t.placeholderDrag}</p>
                  <p className="text-xs text-app-text-muted mt-2">Supports JPG, PNG, WEBP (Max 10MB)</p>
                </div>
              )}

              {/* ACTIVE IMAGE DISPLAY & DETECTOR BOUNDING BOX OVERLAYS */}
              {activeImage && (
                <div className="relative w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center group flex-1">
                  <img 
                    src={activeImage} 
                    className="max-w-full max-h-full object-contain pointer-events-none select-none" 
                    id="vision-active-image" 
                    alt="Active target frame"
                  />
                  
                  {/* Bounding Boxes */}
                  <div className="absolute inset-0 z-10">
                    <div className="absolute inset-x-0 inset-y-0 max-w-full max-h-full m-auto relative aspect-auto" style={{ width: '100%', height: '100%' }}>
                      {detectedObjects.map((obj) => {
                        const top = obj.boundingBox.ymin;
                        const left = obj.boundingBox.xmin;
                        const height = obj.boundingBox.ymax - obj.boundingBox.ymin;
                        const width = obj.boundingBox.xmax - obj.boundingBox.xmin;

                        const isHovered = hoveredObjectId === obj.id;
                        const isSelected = selectedObjectId === obj.id;

                        // Skip drawing degenerate boxes
                        if (width <= 0 || height <= 0) return null;

                        return (
                          <div 
                            key={obj.id}
                            style={{
                              top: `${top}%`,
                              left: `${left}%`,
                              height: `${height}%`,
                              width: `${width}%`,
                            }}
                            onClick={() => setSelectedObjectId(obj.id)}
                            className={`absolute border-2 transition-all cursor-pointer rounded flex flex-col justify-start items-start ${isHovered || isSelected ? 'border-[#3b82f6] bg-[#3b82f6]/15 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-30' : 'border-[#3b82f6]/40 bg-[#3b82f6]/5 hover:border-[#3b82f6]/70 hover:bg-[#3b82f6]/10 z-25'}`}
                            onMouseEnter={() => setHoveredObjectId(obj.id)}
                            onMouseLeave={() => setHoveredObjectId(null)}
                          >
                            <span className={`absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold rounded whitespace-nowrap -mt-0.5 transition-colors shadow ${isHovered || isSelected ? 'bg-[#3b82f6] text-white' : 'bg-neutral-950/80 text-[#3b82f6] border border-[#3b82f6]/30'}`}>
                              {obj.name} ({obj.dimensions.width}x{obj.dimensions.height}mm)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reset overlay buttons */}
                  <div className="absolute bottom-4 left-4 z-25 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveImage(null);
                        setDetectedObjects([]);
                        setDetectError(null);
                        setSelectedObjectId(null);
                        if (sourceMode === 'camera') startCamera();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-red-600 border border-white/10 hover:border-red-500 text-xs text-white transition-all shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t.uploadAnother}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right panel: Controls and Results cards */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Analyze & Detect Trigger Panel */}
            <div className="p-5 rounded-2xl bg-app-surface border border-app-border flex flex-col gap-3">
              <button
                disabled={!activeImage || isDetecting}
                onClick={runDetection}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#3b82f6]/95 text-white disabled:bg-neutral-800 disabled:text-neutral-500 hover:scale-[1.01] active:scale-[0.99] shadow"
              >
                {isDetecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sliders className="w-4 h-4" />
                )}
                {isDetecting ? t.detecting : t.detectBtn}
              </button>

              {detectError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-500" />
                  <p>{detectError}</p>
                </div>
              )}
            </div>

            {/* List of Detected Objects */}
            <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">
                  {language === 'km' ? 'លទ្ធផលដែលរកឃើញ' : 'Identified Objects'} ({detectedObjects.length})
                </span>
                {detectedObjects.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-app-text-muted">
                    <BoxSelect className="w-3.5 h-3.5 text-[#3b82f6]" />
                    {t.confidenceHint}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[480px] custom-scrollbar pr-1">
                {detectedObjects.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-app-surface/50 border border-dashed border-app-border rounded-2xl gap-3">
                    <div className="p-3 bg-neutral-800 rounded-full text-app-text-muted">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-app-text-muted max-w-xs leading-relaxed">
                      {t.noObjects}
                    </span>
                  </div>
                ) : (
                  detectedObjects.map((obj) => {
                    const isHovered = hoveredObjectId === obj.id;
                    const isSelected = selectedObjectId === obj.id;

                    return (
                      <div
                        key={obj.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col gap-3 relative ${isHovered || isSelected ? 'bg-[#3b82f6]/10 border-[#3b82f6] shadow-md' : 'bg-app-surface border-app-border hover:border-app-border/85'}`}
                        onMouseEnter={() => setHoveredObjectId(obj.id)}
                        onMouseLeave={() => setHoveredObjectId(null)}
                        onClick={() => setSelectedObjectId(obj.id)}
                      >
                        {/* Object title & Dimensions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 text-[#3b82f6] text-[10px] font-extrabold flex items-center justify-center">
                              {obj.id.toUpperCase()}
                            </span>
                            <h4 className="text-sm font-bold text-app-text leading-tight">{obj.name}</h4>
                          </div>

                          <div className="p-1 px-1.5 rounded bg-neutral-900 border border-app-border text-[9px] font-extrabold font-mono text-cyan-400">
                            {obj.dimensions.width} x {obj.dimensions.depth} x {obj.dimensions.height} mm
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-app-text-dim leading-relaxed bg-black/15 p-2 rounded-lg border border-white/5">
                          {obj.description}
                        </p>

                        {/* Prompt preview */}
                        <details className="group border border-white/5 bg-black/10 rounded-lg overflow-hidden transition-all duration-300">
                          <summary className="px-2.5 py-1.5 text-[9px] font-black uppercase text-app-text-muted hover:text-white cursor-pointer select-none flex items-center justify-between list-none">
                            <span>{t.extractionPrompt}</span>
                            <span className="text-[10px] text-app-text-muted group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="p-2.5 pt-0 border-t border-white/5">
                            <p className="text-[10px] font-mono leading-relaxed text-app-text-muted whitespace-pre-wrap select-all bg-black/10 p-2 rounded border border-white/5">
                              {obj.extractionPrompt}
                            </p>
                          </div>
                        </details>

                        {/* Action buttons */}
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExtract(obj);
                            }}
                            disabled={isLoadingGlobal}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            {t.extractBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
