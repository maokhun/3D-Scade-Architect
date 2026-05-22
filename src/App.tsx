/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, Suspense } from 'react';
import { 
  Box, 
  Send, 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  ChevronRight, 
  Code as CodeIcon,
  Loader2,
  FileDown,
  Maximize2,
  Layers,
  Cpu,
  Camera,
  AlertCircle,
  BoxSelect,
  ArrowDown,
  Settings,
  ClipboardCheck,
  Clipboard,
  RefreshCw,
  Info,
  Save,
  User,
  Share2,
  Command,
  HelpCircle,
  Package,
  Wrench,
  Disc,
  Database,
  Wind,
  Undo2,
  Redo2,
  FolderOpen,
  Moon,
  Sun,
  X,
  Play,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Float, Stage, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as modeling from '@jscad/modeling';
import { geminiService, ChatMessage } from './services/geminiService';

import { JscadRenderer } from './components/JscadRenderer';
import { VisionWorkspace } from './components/VisionWorkspace';
import { BrandingWorkspace } from './components/BrandingWorkspace';

const PART_LIBRARY = [
  {
    category: "Enclosures",
    icon: <Package className="w-4 h-4" />,
    color: "bg-blue-500/10 text-blue-400",
    prompts: [
      { label: "Basic Box", prompt: "A simple parametric rectangular enclosure with a snap-fit lid." },
      { label: "Smart Wall Box", prompt: "Wall-mounted smart home controller enclosure with cutout for a 2.4-inch screen." },
      { label: "Console Box", prompt: "Angled desktop console enclosure for push buttons and a joystick." },
      { label: "Waterproof Box", prompt: "Heavy-duty enclosure with a gasket groove and bolt-on lid for weatherproofing." },
    ]
  },
  {
    category: "Components",
    icon: <Settings className="w-4 h-4" />,
    color: "bg-amber-500/10 text-amber-400",
    prompts: [
      { label: "Spur Gear", prompt: "Detailed spur gear with customizable module, number of teeth, and bore diameter." },
      { label: "Bevel Gear", prompt: "A 45-degree bevel gear pair for intersecting axes with customizable pitch." },
      { label: "Bearing Block", prompt: "Pillow block housing for a standard skateboard-sized bearing (608)." },
    ]
  },
  {
    category: "Mounts",
    icon: <Wrench className="w-4 h-4" />,
    color: "bg-emerald-500/10 text-emerald-400",
    prompts: [
      { label: "L-Bracket", prompt: "Reinforced corner L-bracket with countersunk screw holes." },
      { label: "DIN Rail Mount", prompt: "Standard 35mm DIN rail mounting clip for industrial equipment." },
      { label: "NEMA 17 Bracket", prompt: "Universal mounting bracket for a NEMA 17 stepper motor." },
    ]
  },
  {
    category: "PCB & Electronics",
    icon: <Cpu className="w-4 h-4" />,
    color: "bg-purple-500/10 text-purple-400",
    prompts: [
      { label: "Arduino Uno Plate", prompt: "Mounting base plate with exact standoff holes for an Arduino Uno." },
      { label: "Raspberry Pi 4 Case", prompt: "Two-part snap-fit case for Raspberry Pi 4 with all port cutouts." },
    ]
  },
  {
    category: "Cooling",
    icon: <Wind className="w-4 h-4" />,
    color: "bg-cyan-500/10 text-cyan-400",
    prompts: [
      { label: "Honeycomb Cooling", prompt: "Modern enclosure with a signature honeycomb mesh lid for optimal heat dissipation." },
      { label: "Ventilation Box", prompt: "Electronic housing featuring high-flow slotted ventilation on all four vertical walls." },
    ]
  }
];

function ModelPlaceholder({ jscadCode, modelParams, onError }: { jscadCode: string | null; modelParams: any; onError?: (err: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  if (jscadCode) {
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* 3D Printer Build Plate Representation (220 x 220 mm) */}
        <group position={[0, 0, 0]}>
          {/* Main PEI/Textured Dark Plate Slab */}
          <mesh position={[0, 0, -1]}>
            <boxGeometry args={[220, 220, 2]} />
            <meshStandardMaterial 
              color="#18181b" 
              roughness={0.8} 
              metalness={0.2} 
            />
          </mesh>

          {/* Copper Heated Bed PCB Layer underneath */}
          <mesh position={[0, 0, -2.1]}>
            <boxGeometry args={[222, 222, 0.2]} />
            <meshStandardMaterial 
              color="#b45309"
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>

          {/* 10mm Spacing Calibration Grid */}
          <gridHelper 
            args={[220, 22, '#3b82f6', '#27272a']} 
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, 0.01]}
          />

          {/* Red 200x200 mm Safe Printable Area Boundary Box */}
          <lineSegments position={[0, 0, 0.02]}>
            <edgesGeometry args={[new THREE.BoxGeometry(200, 200, 0.01)]} />
            <lineBasicMaterial color="#ef4444" transparent opacity={0.6} />
          </lineSegments>

          {/* Calibrated Corner Bracket Marks */}
          {/* Top-Left */}
          <group position={[-100, 100, 0.03]}>
            <mesh position={[5, 0, 0]}>
              <boxGeometry args={[10, 1.2, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[0, -5, 0]}>
              <boxGeometry args={[1.2, 10, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>

          {/* Top-Right */}
          <group position={[100, 100, 0.03]}>
            <mesh position={[-5, 0, 0]}>
              <boxGeometry args={[10, 1.2, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[0, -5, 0]}>
              <boxGeometry args={[1.2, 10, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>

          {/* Bottom-Left */}
          <group position={[-100, -100, 0.03]}>
            <mesh position={[5, 0, 0]}>
              <boxGeometry args={[10, 1.2, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[0, 5, 0]}>
              <boxGeometry args={[1.2, 10, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>

          {/* Bottom-Right */}
          <group position={[100, -100, 0.03]}>
            <mesh position={[-5, 0, 0]}>
              <boxGeometry args={[10, 1.2, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[0, 5, 0]}>
              <boxGeometry args={[1.2, 10, 0.01]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
          </group>

          {/* Measurement specs/labels badge */}
          <Html center position={[0, -114, 0.05]}>
            <div className="bg-zinc-950/90 text-zinc-100 border border-zinc-800 rounded px-2 py-0.5 text-[8px] font-black tracking-widest uppercase flex items-center gap-1 whitespace-nowrap shadow-2xl backdrop-blur select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>220 x 220 mm PRINT PLATFORM</span>
              <span className="text-zinc-500 font-mono text-[7px] ml-1">Z=0.0</span>
            </div>
          </Html>
        </group>

        {/* 3D Model Renderer */}
        <JscadRenderer jscadCode={jscadCode} modelParams={modelParams} onError={onError} />
      </group>
    );
  }

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
        </mesh>
      </Float>
      <Html center position={[0, -2, 0]}>
        <div className="bg-app-surface/80 backdrop-blur px-4 py-2 rounded-lg border border-app-border whitespace-nowrap">
           <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">Waiting for 3D generation...</p>
        </div>
      </Html>
    </group>
  );
}

function Preview3D({ isProcessing, jscadCode, modelParams, onExportStl, onExportScad, showGrid, toggleGrid, onError, renderError, t }: { 
  isProcessing: boolean; 
  jscadCode: string | null; 
  modelParams: any;
  onExportStl?: () => void; 
  onExportScad?: () => void;
  showGrid: boolean;
  toggleGrid: () => void;
  onError?: (err: string) => void; 
  renderError: string | null;
  t: any;
}) {
  return (
    <div className="w-full h-full bg-app-bg relative rounded-md overflow-hidden border border-app-border group">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          <div className="bg-app-surface/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-app-border flex items-center gap-2 shadow-xl">
            <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-[#3b82f6] animate-pulse' : renderError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
            <span className="text-[9px] font-bold text-app-text-dim uppercase tracking-widest">
               {isProcessing ? t.processing : renderError ? 'Error' : t.ready}
            </span>
         </div>
         {renderError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-md text-[9px] font-bold max-w-[180px] backdrop-blur-sm">
               {renderError}
            </div>
         )}
      </div>
      
      <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-3 translate-y-1 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
         <div className="flex flex-col gap-1.5">
            <button 
              onClick={onExportStl}
              disabled={!jscadCode}
              className="flex items-center gap-2 bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-20 text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-xl disabled:pointer-events-none"
            >
               <Download className="w-3.5 h-3.5" />
               Download STL
            </button>
            <button 
              onClick={onExportScad}
              className="flex items-center gap-2 bg-app-surface hover:bg-app-surface-hover text-app-text px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-app-border shadow-xl hover:border-[#3b82f6]"
            >
               <CodeIcon className="w-3.5 h-3.5" />
               Download SCAD
            </button>
         </div>

         <div className="bg-app-surface/80 backdrop-blur-sm p-1 rounded-md border border-app-border flex gap-1 shadow-2xl">
            <button 
              onClick={toggleGrid}
              className={`p-2 rounded-md transition-all ${showGrid ? 'bg-[#3b82f6] text-white' : 'hover:bg-app-surface-hover text-app-text-dim'}`}
              title="Toggle Grid"
            >
              <BoxSelect className="w-3.5 h-3.5" />
            </button>
            <button className="p-2 hover:bg-app-surface-hover rounded-md transition-all text-app-text-dim" title="Maximize">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
         </div>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={45} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.2} shadows="contact">
            <ModelPlaceholder jscadCode={jscadCode} modelParams={modelParams} onError={onError} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
        {showGrid && (
          <Grid 
            infiniteGrid 
            cellSize={2} 
            sectionSize={10} 
            sectionColor="#1e232d" 
            cellColor="#0a0c10"
            fadeDistance={50}
            fadeStrength={3}
          />
        )}
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}

const ChatCodeBlock = ({ children, className }: { children: any; className?: string }) => {
  const [localCopied, setLocalCopied] = useState(false);
  const codeValue = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeValue);
    setLocalCopied(true);
    setTimeout(() => setLocalCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1c23] border border-app-border rounded-t-xl text-[10px] font-bold uppercase text-app-text-muted tracking-widest">
        <div className="flex items-center gap-2">
          <CodeIcon className="w-3 h-3" />
          <span>{className?.replace('language-', '') || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="hover:text-app-text transition-colors flex items-center gap-1"
        >
          {localCopied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5 text-[#3b82f6]" />}
          {localCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="bg-[#0d0f14] p-4 rounded-b-xl border-x border-b border-app-border overflow-x-auto custom-scrollbar text-[12px] leading-relaxed font-mono">
        <code className={className}>{children}</code>
      </div>
    </div>
  );
};

// Types & Helper for Code Revision History Diffing
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

export interface ScadRevision {
  id: string;
  timestamp: number;
  scadCode: string;
  jscadCode: string | null;
  designAnalysis?: string | null;
  modelParams?: Record<string, any>;
  modelParamSpecs?: any[];
  promptMessage: string;
}

export function diffLines(oldCode: string, newCode: string): DiffLine[] {
  const oldLines = oldCode ? oldCode.split('\n') : [];
  const newLines = newCode ? newCode.split('\n') : [];
  const dp: number[][] = Array(oldLines.length + 1).fill(null).map(() => Array(newLines.length + 1).fill(0));

  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: 'unchanged',
        text: oldLines[i - 1],
        lineNumberOld: i,
        lineNumberNew: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: 'added',
        text: newLines[j - 1],
        lineNumberNew: j
      });
      j--;
    } else {
      result.unshift({
        type: 'removed',
        text: oldLines[i - 1],
        lineNumberOld: i
      });
      i--;
    }
  }

  return result;
}

function getUpdatedScadCode(rawScad: string, params: Record<string, any>, specs: any[]): string {
  if (!rawScad) return "";
  let updated = rawScad;
  specs.forEach(spec => {
    const val = params[spec.name];
    if (val !== undefined) {
      if (typeof val === 'string') {
        const regexStr = new RegExp(`^(\\s*${spec.name}\\s*=\\s*)["'][^"']*(["'])(;|\\s*;|$)`, 'm');
        if (regexStr.test(updated)) {
          updated = updated.replace(regexStr, `$1"${val}"$3`);
        } else {
          const regexGeneral = new RegExp(`^(\\s*${spec.name}\\s*=\\s*)[^;\\n]+(;|\\s*;|$)`, 'm');
          if (regexGeneral.test(updated)) {
            updated = updated.replace(regexGeneral, `$1"${val}"$2`);
          }
        }
      } else {
        const regex = new RegExp(`^(\\s*${spec.name}\\s*=\\s*)[^;\\n]+(;|\\s*;|$)`, 'm');
        if (regex.test(updated)) {
          updated = updated.replace(regex, `$1${val}$2`);
        }
      }
    }
  });
  return updated;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentScad, setCurrentScad] = useState<string | null>(null);
  const [currentJscad, setCurrentJscad] = useState<string | null>(null);

  const [editorJscad, setEditorJscad] = useState<string>('');
  const [editorScad, setEditorScad] = useState<string>('');
  const [playgroundSubTab, setPlaygroundSubTab] = useState<'jscad' | 'scad'>('jscad');
  const [showOchafikIframe, setShowOchafikIframe] = useState<boolean>(true);
  const [isCompilingLocal, setIsCompilingLocal] = useState<boolean>(false);

  useEffect(() => {
    if (currentJscad) {
      setEditorJscad(currentJscad);
    } else {
      setEditorJscad('');
    }
  }, [currentJscad]);

  useEffect(() => {
    if (currentScad) {
      setEditorScad(currentScad);
    } else {
      setEditorScad('');
    }
  }, [currentScad]);
  const [activeTab, setActiveTab] = useState<'chat' | 'engine' | 'blueprint' | 'params' | '3d' | 'detect' | 'branding'>('chat');
  const [revisions, setRevisions] = useState<ScadRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const [engineSubTab, setEngineSubTab] = useState<'code' | 'diff'>('code');
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(null);
  const [conceptImages, setConceptImages] = useState<{prompt: string, url: string}[]>([]);
  const [designAnalysis, setDesignAnalysis] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'gemini-3-flash-preview' | 'gemini-3.1-pro-preview'>('gemini-3-flash-preview');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [showChatCamera, setShowChatCamera] = useState(false);
  const [chatCameraStream, setChatCameraStream] = useState<MediaStream | null>(null);
  const [chatCameraError, setChatCameraError] = useState<string | null>(null);
  const chatVideoRef = useRef<HTMLVideoElement>(null);

  const startChatCamera = async () => {
    setChatCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setChatCameraStream(stream);
      // Wait for next tick so ref is bound
      setTimeout(() => {
        if (chatVideoRef.current) {
          chatVideoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err: any) {
      console.error("Error accessing chat camera:", err);
      setChatCameraError(
        language === 'km' 
          ? "មិនអាចបើកកាមេរ៉ាបានទេ! សូមពិនិត្យមើលសិទ្ធិអនុញ្ញាតកាមេរ៉ា។" 
          : "Could not access webcam. Please ensure frame permissions are granted in your browser."
      );
    }
  };

  const stopChatCamera = () => {
    if (chatCameraStream) {
      chatCameraStream.getTracks().forEach(track => track.stop());
      setChatCameraStream(null);
    }
  };

  useEffect(() => {
    if (!showChatCamera) {
      stopChatCamera();
    }
  }, [showChatCamera]);

  useEffect(() => {
    return () => {
      if (chatCameraStream) {
        chatCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [chatCameraStream]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('3d_architect_theme');
    if (savedTheme === 'light') setTheme('light');
  }, []);

  useEffect(() => {
    localStorage.setItem('3d_architect_theme', theme);
  }, [theme]);

  // Synchronize SCAD revisions with changes to currentScad
  useEffect(() => {
    if (!currentScad) return;

    setRevisions(prev => {
      // Identify duplicates
      const lastRevision = prev.find(r => r.scadCode === currentScad);
      if (lastRevision) {
        return prev;
      }

      // Get last user prompt as action summary
      let promptMessage = "";
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          promptMessage = messages[i].parts.map(p => p.text).join(' ');
          break;
        }
      }

      if (!promptMessage) {
        promptMessage = "Base Design Outline";
      } else if (promptMessage.length > 45) {
        promptMessage = promptMessage.substring(0, 45) + "...";
      }

      const newRev: ScadRevision = {
        id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        scadCode: currentScad,
        jscadCode: currentJscad,
        designAnalysis,
        modelParams,
        modelParamSpecs,
        promptMessage
      };

      const newRevs = [...prev, newRev];
      if (newRevs.length > 30) {
        newRevs.shift();
      }
      return newRevs;
    });
  }, [currentScad]);

  // Synchronize selectedRevisionId and previewRevisionId
  useEffect(() => {
    if (currentScad && revisions.length > 0) {
      const matched = revisions.find(r => r.scadCode === currentScad);
      if (matched) {
        setSelectedRevisionId(matched.id);
        setPreviewRevisionId(matched.id);
      }
    }
  }, [currentScad, revisions]);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [modelParams, setModelParams] = useState<Record<string, any>>({});
  const [modelParamSpecs, setModelParamSpecs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'km'>('en');
  const [iframeUrl, setIframeUrl] = useState<string>('https://ochafik.com/openscad/');
  const [debouncedIframeUrl, setDebouncedIframeUrl] = useState<string>('https://ochafik.com/openscad/');
  const lastScadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoading && currentScad) {
      const updatedCode = getUpdatedScadCode(currentScad, modelParams, modelParamSpecs);
      const nextUrl = `https://ochafik.com/openscad/#code=${encodeURIComponent(updatedCode)}`;
      setIframeUrl(nextUrl);
    } else if (!currentScad) {
      setIframeUrl('https://ochafik.com/openscad/');
    }
  }, [isLoading, currentScad, modelParams, modelParamSpecs]);

  useEffect(() => {
    if (isLoading) return;

    const updatedCode = currentScad ? getUpdatedScadCode(currentScad, modelParams, modelParamSpecs) : "";
    const nextUrl = currentScad 
      ? `https://ochafik.com/openscad/#code=${encodeURIComponent(updatedCode)}` 
      : 'https://ochafik.com/openscad/';

    const isNewScadCode = lastScadRef.current !== currentScad;
    lastScadRef.current = currentScad;

    // Use a very short delay (50ms) for newly generated SCAD codes so they load immediately,
    // and a friendly delay (850ms) for slider modifications so we do not constantly reload while dragging.
    const delay = isNewScadCode ? 50 : 850;

    const handler = setTimeout(() => {
      setDebouncedIframeUrl(nextUrl);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [isLoading, currentScad, modelParams, modelParamSpecs]);

  // History & Persistence
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDesigns, setSavedDesigns] = useState<{ name: string; timestamp: number; data: any }[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [designName, setDesignName] = useState('New Design');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [engineView, setEngineView] = useState<'jscad' | 'scad'>('jscad');

  useEffect(() => {
    const saved = localStorage.getItem('3d_architect_saved_designs');
    if (saved) {
      try {
        setSavedDesigns(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved designs", e);
      }
    }
  }, []);

  const pushToHistory = (data: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(data)));
    if (newHistory.length > 50) newHistory.shift(); // Limit history size
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const applyHistoryState = (state: any) => {
    setMessages(state.messages);
    setCurrentScad(state.currentScad);
    setCurrentJscad(state.currentJscad);
    setDesignAnalysis(state.designAnalysis);
    setModelParams(state.modelParams);
    setModelParamSpecs(state.modelParamSpecs);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      applyHistoryState(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      applyHistoryState(history[newIndex]);
    }
  };

  const handleRenderPlaygroundCode = () => {
    setIsCompilingLocal(true);
    setRenderError(null);
    setTimeout(() => {
      try {
        if (playgroundSubTab === 'jscad') {
          // Verify code runs by creating a function from it test
          const positiveKeys = [
            'size', 'radius', 'height', 'width', 'length', 
            'radiusStart', 'radiusEnd', 'innerRadius', 'outerRadius', 
            'roundRadius', 'thickness', 'depth', 'offset', 'expand', 'delta'
          ];
          const sanitizeOptions = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;
            const newObj = { ...obj };
            for (const key in newObj) {
              if (positiveKeys.includes(key) && typeof newObj[key] === 'number') {
                newObj[key] = Math.max(0.001, newObj[key]);
              }
            }
            return newObj;
          };

          const candidates: string[] = ['main', 'defaultExport', 'Main', 'main_model', 'render'];
          if (editorJscad) {
            const funcDeclRegex = /\bfunction\s+([a-zA-Z0-9_]+)\s*\(/g;
            const varDeclRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
            const funcExprRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*function/g;
            let match;
            while ((match = funcDeclRegex.exec(editorJscad)) !== null) {
              if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
                candidates.push(match[1]);
              }
            }
            while ((match = varDeclRegex.exec(editorJscad)) !== null) {
              if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
                candidates.push(match[1]);
              }
            }
            while ((match = funcExprRegex.exec(editorJscad)) !== null) {
              if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
                candidates.push(match[1]);
              }
            }
          }

          const script = `
            var require = (pkg) => pkg === '@jscad/modeling' ? modeling : {};
            var module = { exports: {} };
            var exports = module.exports;
            var { primitives, extrusions, transforms, booleans, colors, expansions, geometries, hulls, measurements, mathematics, utils } = modeling;
            ${editorJscad
              .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
              .replace(/\bexport\s+default\s+/g, 'var defaultExport = ')
              .replace(/\bexport\s+(const|let|var)\s+/g, 'var ')
              .replace(/\bexport\s+function\s+/g, 'function ')
              .replace(/\bexport\s+class\s+/g, 'class ')
              .replace(/\bexport\s+\{[\s\S]*?\};?/g, '')
              .replace(/\bconst\b/g, 'var')
              .replace(/\blet\b/g, 'var')
            }
            var finalMain = null;
            if (typeof main !== 'undefined' && typeof main === 'function') {
              finalMain = main;
            } else if (typeof defaultExport !== 'undefined' && typeof defaultExport === 'function') {
              finalMain = defaultExport;
            } else if (typeof module !== 'undefined' && module.exports) {
              if (typeof module.exports === 'function') {
                finalMain = module.exports;
              } else if (typeof module.exports.main === 'function') {
                finalMain = module.exports.main;
              } else if (typeof module.exports.default === 'function') {
                finalMain = module.exports.default;
              }
            }
            if (!finalMain && typeof exports !== 'undefined') {
              if (typeof exports === 'function') {
                finalMain = exports;
              } else if (typeof exports.main === 'function') {
                finalMain = exports.main;
              } else if (typeof exports.default === 'function') {
                finalMain = exports.default;
              }
            }

            // Fallback candidate lookup
            ${candidates.map(name => `
            if (!finalMain && typeof ${name} !== 'undefined' && typeof ${name} === 'function') {
              finalMain = ${name};
            }
            `).join('\n')}
            
            if (typeof finalMain !== 'function') throw new Error('JSCAD main function not found. Please ensure your script contains a \"function main()\" or \"export const main = ...\" declaration at the top level.');
            return finalMain(modelParams);
          `;
          // Evaluate immediately to verify compilation syntax
          const testFunc = new Function('modeling', 'modelParams', script);
          testFunc(modeling, modelParams);

          setCurrentJscad(editorJscad);
          
          setRevisions(prev => prev.map(rev => {
            if (rev.id === selectedRevisionId) {
              return { ...rev, jscadCode: editorJscad };
            }
            return rev;
          }));
        } else {
          setCurrentScad(editorScad);
          setRevisions(prev => prev.map(rev => {
            if (rev.id === selectedRevisionId) {
              return { ...rev, scadCode: editorScad };
            }
            return rev;
          }));
        }
      } catch (err: any) {
        console.error("Local compile error:", err);
        setRenderError(err?.message || "Local compilation syntax error");
      } finally {
        setIsCompilingLocal(false);
      }
    }, 300);
  };

  const handleRevertToRevision = (revision: ScadRevision) => {
    setCurrentScad(revision.scadCode);
    setCurrentJscad(revision.jscadCode);
    if (revision.designAnalysis) setDesignAnalysis(revision.designAnalysis);
    if (revision.modelParams) setModelParams(revision.modelParams);
    if (revision.modelParamSpecs) setModelParamSpecs(revision.modelParamSpecs);

    // Sync preview selection as well
    setPreviewRevisionId(revision.id);

    // Push into active undo/redo stack
    const currentState = {
      messages,
      currentScad: revision.scadCode,
      currentJscad: revision.jscadCode,
      designAnalysis: revision.designAnalysis || designAnalysis,
      modelParams: revision.modelParams || modelParams,
      modelParamSpecs: revision.modelParamSpecs || modelParamSpecs
    };
    pushToHistory(currentState);
  };

  const handleSaveDesign = () => {
    const currentState = {
      messages,
      currentScad,
      currentJscad,
      designAnalysis,
      modelParams,
      modelParamSpecs
    };
    const newDesign = {
      name: designName || `Design ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      data: currentState
    };
    const updated = [newDesign, ...savedDesigns];
    setSavedDesigns(updated);
    localStorage.setItem('3d_architect_saved_designs', JSON.stringify(updated));
    setShowSaveNaming(false);
  };

  const handleLoadDesign = (design: any) => {
    applyHistoryState(design.data);
    pushToHistory(design.data);
    setShowSavedList(false);
  };

  const handleDeleteSaved = (timestamp: number) => {
    const updated = savedDesigns.filter(d => d.timestamp !== timestamp);
    setSavedDesigns(updated);
    localStorage.setItem('3d_architect_saved_designs', JSON.stringify(updated));
  };

  // Proactively push state to history when changed by user or AI
  useEffect(() => {
    // Only push if we actually have a design and this isn't the initial load
    if (currentJscad || currentScad) {
        const timeout = setTimeout(() => {
            const currentState = {
                messages,
                currentScad,
                currentJscad,
                designAnalysis,
                modelParams,
                modelParamSpecs
            };
            // Deep check to avoid duplicates in history (e.g. from undo/redo triggers)
            const lastHistory = history[historyIndex];
            const currentStr = JSON.stringify(currentState);
            const lastStr = lastHistory ? JSON.stringify(lastHistory) : "";
            
            if (currentStr !== lastStr) {
                pushToHistory(currentState);
            }
        }, 800); // Debounce to allow multiple rapid state updates (like param sliding)
        return () => clearTimeout(timeout);
    }
  }, [currentJscad, currentScad, modelParams]);

  const t = {
    en: {
      title: "3D ARCHITECT",
      subtitle: "Design Intelligence",
      library: "Part Library",
      status: "Node Status",
      ready: "Engine Ready",
      processing: "Processing...",
      chat: "Chat",
      engine: "Engine",
      blueprint: "Blueprint",
      params: "Tweak Params",
      prev3d: "3D",
      placeholder: "Type your request (e.g. A box with lid)...",
      clear: "Clear History",
      exportStl: "Export .STL",
      downloadScad: "Download .SCAD",
      reset: "Reset Defaults",
      noParams: "No tweakable parameters detected.",
      tweakerTitle: "Parametric Assembly",
      tweakerSub: "Fine-tune the generated model in real-time",
      analyzing: "Analyzing request...",
      generating: "Thinking...",
      thinking: "Thinking..."
    },
    km: {
      title: "អ្នករចនា 3D",
      subtitle: "បញ្ញាសិប្បនិម្មិតសម្រាប់ការរចនា",
      library: "បណ្ណាល័យគ្រឿងបន្លាស់",
      status: "ស្ថានភាពម៉ាស៊ីន",
      ready: "ម៉ាស៊ីនរួចរាល់",
      processing: "កំពុងដំណើរការ...",
      chat: "ជជែក",
      engine: "កូដ",
      blueprint: "ប្លង់មេ",
      params: "កែសម្រួល",
      prev3d: "ទិដ្ឋភាព 3D",
      placeholder: "បញ្ចូលសំណើរបស់អ្នក (ឧទាហរណ៍៖ ប្រអប់មានគម្រប)...",
      clear: "សម្អាតប្រវត្តិ",
      exportStl: "នាំចេញ .STL",
      downloadScad: "ទាញយក .SCAD",
      reset: "កំណត់ឡើងវិញ",
      noParams: "រកមិនឃើញប៉ារ៉ាម៉ែត្រដែលអាចកែសម្រួលបានឡើយ",
      tweakerTitle: "ការដំឡើងតាមប៉ារ៉ាម៉ែត្រ",
      tweakerSub: "កែតម្រូវគំរូដែលបានបង្កើតក្នុងពេលជាក់ស្តែង",
      analyzing: "កំពុងវិភាគសំណើ...",
      generating: "កំពុងបង្កើតចម្លើយ...",
      thinking: "កំពុងគិត..."
    }
  }[language];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottom(!isAtBottom);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setSelectedImage(result);
        setLastUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && !selectedImage) return;

    setRenderError(null);
    const newParts: any[] = [];
    if (textToSend.trim()) {
      const languageInstruction = language === 'km' ? "កំណត់សម្គាល់៖ សូមឆ្លើយតបជាភាសាខ្មែរ ចំពោះការវិភាគ និងការពន្យល់។\n\n" : "";
      newParts.push({ text: languageInstruction + textToSend });
    }
    if (selectedImage) {
      newParts.push({
        inlineData: {
          mimeType: selectedImage.split(';')[0].split(':')[1],
          data: selectedImage.split(',')[1]
        }
      });
    }

    const newUserMessage: ChatMessage = {
      role: 'user',
      parts: newParts
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setLoadingStep(t.thinking || 'Thinking...');

    try {
      setLoadingStep(t.generating || 'Thinking...');

      // Prepare context to supply Gemini with the active model and parameters
      const activeScad = editorScad || currentScad;
      const activeJscad = editorJscad || currentJscad;
      let apiParts = [...newParts];
      
      if (activeScad || activeJscad) {
        const contextText = `\n\n---
[CURRENT ACTIVE 3D MODEL STATE - CRITICAL SYSTEM DIRECTIVE]
The user is currently viewing, evaluating, or customizing the 3D model shown below.
If the user's request is an edit, adjustment, addition, continuation, or refinement (such as adding holes, modifying dimensions, adding/modifying lids, or adjusting features of the existing model), you MUST build directly upon this existing code.
- DO NOT start a completely new design from scratch unless explicitly requested.
- Preserve the existing variable names, parameters structure, and core logic as much as possible to ensure continuity.
- Update BOTH the OpenSCAD (.scad) and JSCAD (.jscad) code to reflect the requested adjustments.
- Retain existing parametric parameters, and add new ones if new customizable features are introduced.

Current OpenSCAD (.scad) Code:
\`\`\`scad
${activeScad || ""}
\`\`\`

Current JSCAD (.jscad) Code:
\`\`\`jscad
${activeJscad || ""}
\`\`\`

Current Parameter Specifications:
${modelParamSpecs ? JSON.stringify(modelParamSpecs, null, 2) : "None"}

Current Active Parameter Values:
${modelParams ? JSON.stringify(modelParams, null, 2) : "None"}`;

        if (apiParts.length > 0 && apiParts[0].text) {
          apiParts[0] = { ...apiParts[0], text: apiParts[0].text + contextText };
        } else {
          apiParts.push({ text: contextText });
        }
      }

      const apiUserMessage: ChatMessage = {
        role: 'user',
        parts: apiParts
      };

      const response = await geminiService.generate3DCode([...messages, apiUserMessage], selectedModel);
      
      if (!response) throw new Error("Empty response from AI.");

      const assistantMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: response }]
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Extract code
      const scadMatch = response.match(/```scad([\s\S]*?)```/);
      if (scadMatch) {
         const code = scadMatch[1].trim();
         setCurrentScad(code);
      }

      const jscadMatch = response.match(/```jscad([\s\S]*?)```/);
      if (jscadMatch) setCurrentJscad(jscadMatch[1].trim());

      // Extract parameters
      const paramsMatch = response.match(/```json([\s\S]*?)```/);
      if (paramsMatch) {
         try {
            const specs = JSON.parse(paramsMatch[1].trim());
            if (Array.isArray(specs)) {
               setModelParamSpecs(specs);
               const initialParams: Record<string, any> = {};
               specs.forEach(s => {
                  initialParams[s.name] = s.default;
               });
               setModelParams(initialParams);
            }
         } catch (e) {
            console.warn("Failed to parse parameters JSON", e);
         }
      }

      // Extract analysis (everything before the code)
      const analysis = response.split('```')[0].trim();
      setDesignAnalysis(analysis);

      // Auto-switch to 3D tab if code was generated
      if (jscadMatch || scadMatch) {
         setActiveTab('3d');
      }

      // Concept image
      if (textToSend) {
        const seed = Math.floor(Math.random() * 1000000);
        const conceptUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(textToSend)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        setConceptImages(prev => [{ prompt: textToSend, url: conceptUrl }, ...prev]);
      }
      
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error?.message || 'Failed to generate model'}`);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const exportStl = async () => {
    if (!currentJscad) return;
    try {
      const jscadStlSerializer = await import('@jscad/stl-serializer');
      
      const serialize = jscadStlSerializer.serialize;
      
      const candidates: string[] = ['main', 'defaultExport', 'Main', 'main_model', 'render'];
      if (currentJscad) {
        const funcDeclRegex = /\bfunction\s+([a-zA-Z0-9_]+)\s*\(/g;
        const varDeclRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
        const funcExprRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*function/g;
        let match;
        while ((match = funcDeclRegex.exec(currentJscad)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
        while ((match = varDeclRegex.exec(currentJscad)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
        while ((match = funcExprRegex.exec(currentJscad)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
      }

      const script = `
        var require = (pkg) => pkg === '@jscad/modeling' ? modeling : {};
        var module = { exports: {} };
        var exports = module.exports;
        var { primitives, extrusions, transforms, booleans, colors, expansions, geometries, hulls, measurements, mathematics, utils } = modeling;
        ${currentJscad
          .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
          .replace(/\bexport\s+default\s+/g, 'var defaultExport = ')
          .replace(/\bexport\s+(const|let|var)\s+/g, 'var ')
          .replace(/\bexport\s+function\s+/g, 'function ')
          .replace(/\bexport\s+class\s+/g, 'class ')
          .replace(/\bexport\s+\{[\s\S]*?\};?/g, '')
          .replace(/\bconst\b/g, 'var')
          .replace(/\blet\b/g, 'var')
        }
        var finalMain = null;
        if (typeof main !== 'undefined' && typeof main === 'function') {
          finalMain = main;
        } else if (typeof defaultExport !== 'undefined' && typeof defaultExport === 'function') {
          finalMain = defaultExport;
        } else if (typeof module !== 'undefined' && module.exports) {
          if (typeof module.exports === 'function') {
            finalMain = module.exports;
          } else if (typeof module.exports.main === 'function') {
            finalMain = module.exports.main;
          } else if (typeof module.exports.default === 'function') {
            finalMain = module.exports.default;
          }
        }
        if (!finalMain && typeof exports !== 'undefined') {
          if (typeof exports === 'function') {
            finalMain = exports;
          } else if (typeof exports.main === 'function') {
            finalMain = exports.main;
          } else if (typeof exports.default === 'function') {
            finalMain = exports.default;
          }
        }

        // Fallback candidate lookup
        ${candidates.map(name => `
        if (!finalMain && typeof ${name} !== 'undefined' && typeof ${name} === 'function') {
          finalMain = ${name};
        }
        `).join('\n')}

        if (typeof finalMain !== 'function') throw new Error('JSCAD main function not found');
        return finalMain(modelParams);
      `;

      const mainFunc = new Function('modeling', 'modelParams', script);
      const result = mainFunc(modeling, modelParams);
      
      const rawData = serialize({ binary: true }, result);
      const blob = new Blob(rawData, { type: 'application/sla' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `3d-model-${Date.now()}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('STL Export failed.');
    }
  };

  const exportScad = () => {
    if (!currentScad) return;
    const blob = new Blob([currentScad], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${Date.now()}.scad`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex h-screen bg-app-bg text-app-text-dim ${language === 'km' ? 'font-khmer' : 'font-sans'} overflow-hidden select-none ${theme === 'light' ? 'light' : ''}`}>
       {/* Slim Tool Sidebar */}
       <div className={`fixed inset-0 z-50 lg:relative lg:flex lg:w-16 border-r border-app-border flex flex-col items-center py-6 bg-app-bg gap-8 shrink-0 transition-transform duration-300 ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="absolute top-4 right-[-40px] lg:hidden">
             <button 
               onClick={() => setShowMobileSidebar(!showMobileSidebar)}
               className="p-2 bg-app-surface border border-app-border rounded-r-md text-app-text-muted"
             >
               {showMobileSidebar ? <Trash2 className="w-5 h-5 rotate-45" /> : <ChevronRight className="w-5 h-5" />}
             </button>
          </div>
          <div className="p-2.5 bg-[#3b82f6] rounded-xl shadow-lg shadow-blue-500/20">
             <Box className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col gap-4">
             <button 
               onClick={() => setExpandedCategory(expandedCategory ? null : PART_LIBRARY[0].category)}
               className={`p-3 rounded-xl transition-all ${expandedCategory ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="Components Library"
             >
               <Layers className="w-6 h-6" />
             </button>
             <button 
               onClick={() => setShowShortcuts(!showShortcuts)}
               className={`p-3 rounded-xl transition-all ${showShortcuts ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="Keyboard Shortcuts"
             >
               <Command className="w-6 h-6" />
             </button>
             <button 
               onClick={() => setShowSettings(true)}
               className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="System Settings"
             >
               <Settings className="w-6 h-6" />
             </button>
          </div>
          <div className="mt-auto flex flex-col gap-4">
             <button className="p-3 rounded-xl hover:bg-app-surface text-app-text-muted hover:text-app-text transition-all"><HelpCircle className="w-6 h-6" /></button>
             <div className="w-8 h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[10px] font-bold">MK</div>
          </div>
       </div>

       {/* Project Pane (Collapsible Library) */}
      <div className="w-[300px] border-r border-app-border flex flex-col bg-app-bg hidden lg:flex shrink-0">
        <div className="p-6">
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted mb-6">{t.library}</h2>
           <div className="grid grid-cols-1 gap-3">
              {PART_LIBRARY.map((entry, i) => (
                <div key={i} className="group">
                  <button 
                    onClick={() => setExpandedCategory(expandedCategory === entry.category ? null : entry.category)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${expandedCategory === entry.category ? 'bg-app-surface border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-app-bg border-app-border hover:border-[#3b82f6]/50'}`}
                  >
                     <div className={`p-2 rounded-lg ${entry.color}`}>
                        {entry.icon}
                     </div>
                     <div className="flex-1">
                        <p className={`text-[12px] font-bold transition-colors ${expandedCategory === entry.category ? 'text-app-text' : 'text-app-text-dim'}`}>{entry.category}</p>
                        <p className="text-[9px] text-app-text-muted mt-0.5">{entry.prompts.length} Modules</p>
                     </div>
                     <ChevronRight className={`w-3.5 h-3.5 transition-transform text-app-text-muted ${expandedCategory === entry.category ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {expandedCategory === entry.category && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-2 ml-4 space-y-1"
                      >
                         {entry.prompts.map((p, j) => (
                           <button 
                             key={j}
                             onClick={() => { setInput(p.prompt); handleSend(p.prompt); }}
                             className="w-full text-left px-4 py-2 rounded-lg hover:bg-app-surface group flex items-center gap-2 transition-all"
                           >
                              <div className="w-1 h-1 rounded-full bg-app-border group-hover:bg-[#3b82f6]"></div>
                              <span className="text-[11px] font-medium text-app-text-muted group-hover:text-app-text transition-colors">{p.label}</span>
                           </button>
                         ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
           </div>
        </div>

        <div className="mt-auto p-6 border-t border-app-border">
            <div className="bg-app-surface p-1 rounded-xl flex gap-1 mb-4">
              <button onClick={() => setLanguage('en')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${language === 'en' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-app-text-muted hover:text-app-text-dim'}`}>EN</button>
              <button onClick={() => setLanguage('km')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${language === 'km' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-app-text-muted hover:text-app-text-dim'}`}>KM</button>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono mb-2">
               <span className="text-app-text-muted">Latency</span>
               <span className="text-emerald-500 font-bold">124ms</span>
            </div>
            <div className="w-full h-1 bg-app-border rounded-full overflow-hidden">
               <div className="w-[85%] h-full bg-[#3b82f6]"></div>
            </div>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-app-bg relative">
        <header className="h-auto min-h-[3.5rem] border-b border-app-border flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:py-0 gap-4 shrink-0 bg-app-bg z-20">
           <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                   className="lg:hidden p-1.5 rounded-md hover:bg-app-surface text-app-text-muted"
                 >
                   <Package className="w-5 h-5" />
                 </button>
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <h1 className={`font-black text-xs sm:text-sm tracking-widest text-app-text uppercase ${language === 'km' ? 'font-khmer-title' : 'font-sans'}`}>Untitled Design_v1.4</h1>
              </div>

              <div className="flex items-center gap-1 border-l border-r border-app-border px-2 sm:px-4 h-8">
                 <button 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 rounded-md hover:bg-app-surface text-app-text-muted hover:text-[#3b82f6] disabled:opacity-20 transition-all" 
                  title="Undo"
                 >
                    <Undo2 className="w-4 h-4" />
                 </button>
                 <button 
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 rounded-md hover:bg-app-surface text-app-text-muted hover:text-[#3b82f6] disabled:opacity-20 transition-all" 
                  title="Redo"
                 >
                    <Redo2 className="w-4 h-4" />
                 </button>
              </div>

              <div className="flex items-center gap-1 bg-app-surface p-1 rounded-lg overflow-x-auto max-w-full scrollbar-hide py-1">
                {[
                  { id: '3d', label: language === 'km' ? 'កម្មវិធីមើល 3D (ochafik)' : 'OpenSCAD Viewer' },
                  { id: 'chat', label: language === 'km' ? 'ជជែក' : 'Chat' },
                  { id: 'engine', label: language === 'km' ? 'កូដ' : 'Engine' },
                  { id: 'blueprint', label: language === 'km' ? 'ប្លង់មេ' : 'Blueprint' },
                  { id: 'params', label: language === 'km' ? 'កែសម្រួល' : 'Params' },
                  { id: 'detect', label: language === 'km' ? 'សម្គាល់វត្ថុ' : 'Vision Detector' },
                  { id: 'branding', label: language === 'km' ? 'ម៉ាកផលិតផល' : 'Branding & Assets' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#3b82f6] text-white shadow-sm border border-[#3b82f6]' : 'text-app-text-muted hover:text-app-text-dim'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSavedList(true)}
                className="p-2 rounded-lg hover:bg-app-surface text-app-text-muted hover:text-app-text transition-all"
                title="Saved Designs"
              >
                 <FolderOpen className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowSaveNaming(true)}
                disabled={!currentJscad}
                className="p-2 rounded-lg hover:bg-app-surface text-app-text-muted hover:text-app-text transition-all disabled:opacity-20"
                title="Save Design"
              >
                 <Save className="w-5 h-5" />
              </button>
              <button 
                onClick={exportScad}
                disabled={!currentScad}
                className="hidden"
              >
                 <CodeIcon className="w-4 h-4" />
                 SCAD
              </button>
              <button 
                onClick={exportStl} 
                disabled={!currentJscad}
                className="hidden"
              >
                 <Download className="w-4 h-4" />
                 STL
              </button>
           </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
           <div className="flex-1 relative">
             {/* Large Central Canvas */}
             <div className="h-full w-full">
                {activeTab === '3d' ? (
                   <div className="w-full h-full bg-[#0b0c10] relative overflow-hidden">
                      <iframe
                        key={debouncedIframeUrl}
                        src={debouncedIframeUrl}
                        className="w-full h-full border-none"
                        title="OpenSCAD Editor and Viewer"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads allow-forms"
                      />
                    </div>
) : activeTab === 'chat' ? (
                  <div className="h-full overflow-y-auto bg-app-bg custom-scrollbar p-8 relative" onScroll={handleScroll}>
                     <div className="max-w-3xl mx-auto space-y-8 pb-32">
                        {messages.map((m, i) => (
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-6 rounded-2xl max-w-[85%] text-[14px] leading-relaxed border shadow-2xl ${m.role === 'user' ? 'bg-[#3b82f6] border-[#2563eb] text-white font-medium' : 'bg-app-surface border-app-border text-app-text-dim'}`}>
                                 <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm`}>
                                   <ReactMarkdown
                                     components={{
                                       code({ node, inline, className, children, ...props }: any) {
                                         if (!inline) {
                                           return <ChatCodeBlock className={className}>{children}</ChatCodeBlock>;
                                         }
                                         return <code className={className} {...props}>{children}</code>;
                                       }
                                     }}
                                   >
                                     {m.parts.map(p => p.text).join('')}
                                   </ReactMarkdown>
                                 </div>
                              </div>
                           </motion.div>
                        ))}
                        {isLoading && (
                           <div className="flex justify-start">
                              <div className="bg-app-surface border border-app-border rounded-2xl p-4 flex items-center gap-4 animate-pulse shadow-2xl">
                                 <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
                                 <span className="text-[12px] font-bold text-app-text-muted uppercase tracking-widest">{loadingStep}</span>
                              </div>
                           </div>
                        )}
                        <div ref={chatEndRef} />
                     </div>
                     </div>
                 ) : activeTab === 'engine' ? (
                    <div className="h-full bg-[#0d0f14] custom-scrollbar flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-app-border selection:bg-[#264f78]">
                      {/* Left Sidebar: Revisions list */}
                      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-[#0f111a] border-r border-[#1e293b]/20">
                         <div className="p-4 border-b border-app-border">
                            <span className="text-[10px] uppercase tracking-widest font-black text-app-text-muted select-none">
                               {language === 'km' ? 'ប្រវត្តិរចនា និងជំនាន់' : 'Revision Timeline'}
                            </span>
                            <h3 className="text-sm font-black text-white mt-1 uppercase tracking-tight">
                               {language === 'km' ? 'ជំនាន់កូដ (' : 'Code Versions ('} {revisions.length} )
                            </h3>
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 max-h-[250px] lg:max-h-none">
                            {revisions.length === 0 ? (
                               <div className="p-4 text-center">
                                  <p className="text-[11px] text-app-text-muted italic">
                                     {language === 'km' ? 'មិនទាន់មានប្រវត្តិជំនាន់នៅឡើយទេ' : 'No revisions found. Ask AI to generate a 3D model to start tracking.'}
                                  </p>
                               </div>
                            ) : (
                               [...revisions].reverse().map((rev) => {
                                  const displayNum = revisions.findIndex(r => r.id === rev.id) + 1;
                                  const isActive = rev.id === selectedRevisionId;
                                  const isPreviewed = rev.id === previewRevisionId;
                                  return (
                                     <button
                                        key={rev.id}
                                        onClick={() => setPreviewRevisionId(rev.id)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                                           isPreviewed 
                                              ? 'bg-[#1d4ed8]/10 border-[#3b82f6]/40 shadow-md shadow-blue-500/5' 
                                              : 'bg-app-surface/40 hover:bg-app-surface/80 border-app-border/40 hover:border-app-border'
                                        }`}
                                     >
                                        <div className="flex items-center justify-between w-full">
                                           <span className="font-mono text-[11px] font-black tracking-wide text-white">
                                              v{displayNum}
                                           </span>
                                           {isActive ? (
                                              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 animate-pulse">
                                                 {language === 'km' ? 'សកម្ម' : 'Active'}
                                              </span>
                                           ) : (
                                              <span className="text-[9px] font-black uppercase text-app-text-muted bg-app-surface border border-app-border px-2 py-0.5 rounded-full">
                                                 {language === 'km' ? 'ចាស់' : 'Old'}
                                              </span>
                                           )}
                                        </div>
                                        <p className="text-[11.5px] italic text-app-text-dim line-clamp-2 leading-relaxed">
                                           "{rev.promptMessage}"
                                        </p>
                                        <div className="flex items-center justify-between text-[10px] text-app-text-muted font-medium pt-1 border-t border-app-border/20">
                                           <span>{new Date(rev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</span>
                                           {isPreviewed && <span className="text-[#3b82f6] font-bold uppercase text-[9px] tracking-wider">{language === 'km' ? 'កំពុងមើល' : 'Viewing'}</span>}
                                        </div>
                                     </button>
                                  );
                               })
                            )}
                         </div>
                      </div>

                      {/* Right Panel: Code Viewer and Diff Viewer */}
                      <div className="flex-1 flex flex-col min-w-0 bg-[#07080c]">
                         {(() => {
                            const previewRev = revisions.find(r => r.id === previewRevisionId) || (revisions.length > 0 ? revisions[revisions.length - 1] : null);
                            if (!previewRev) {
                               return (
                                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#07080c]">
                                     <CodeIcon className="w-12 h-12 text-app-text-muted animate-pulse mb-4" />
                                     <h3 className="text-white font-black uppercase tracking-widest text-xs">
                                        {language === 'km' ? 'មិនទាន់មានកូដនៅឡើយទេ' : 'Engine Code Empty'}
                                     </h3>
                                     <p className="text-[11.5px] text-app-text-muted max-w-sm mt-2 leading-relaxed">
                                        {language === 'km' 
                                           ? 'សូមសរសេរការណែនាំរបស់អ្នកក្នុងប្រអប់ "ជជែក" ដើម្បីបង្កើតកូដដំបូងបង្អស់។' 
                                           : 'Ask the design AI a part prompt in the Chat window to generate your first revision history.'}
                                     </p>
                                  </div>
                               );
                            }

                            const prevIdx = revisions.findIndex(r => r.id === previewRev.id);
                            const predecessor = prevIdx > 0 ? revisions[prevIdx - 1] : null;

                            return (
                               <>
                                  {/* Toolbar header */}
                                  <div className="p-4 border-b border-[#1e293b]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0c12]">
                                     <div className="flex flex-wrap items-center gap-2">
                                        {/* Format Toggle (JSCAD / SCAD) */}
                                        <div className="flex bg-app-surface p-1 rounded-lg border border-app-border/60">
                                           <button 
                                              onClick={() => setEngineView('jscad')}
                                              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${engineView === 'jscad' ? 'bg-[#3b82f6] text-white shadow' : 'text-app-text-muted hover:text-app-text-dim'}`}
                                           >
                                              JSCAD
                                           </button>
                                           <button 
                                              onClick={() => setEngineView('scad')}
                                              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${engineView === 'scad' ? 'bg-[#3b82f6] text-white shadow' : 'text-app-text-muted hover:text-app-text-dim'}`}
                                           >
                                              OpenSCAD
                                           </button>
                                        </div>

                                        {/* Mode Selector (Code vs Diff) */}
                                        <div className="flex bg-[#11131a] p-1 rounded-lg border border-app-border/60">
                                           <button 
                                              onClick={() => setEngineSubTab('code')}
                                              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${engineSubTab === 'code' ? 'bg-[#10b981] text-white shadow' : 'text-app-text-muted hover:text-app-text-dim'}`}
                                              title="Raw Code Viewer"
                                           >
                                              <CodeIcon className="w-3 h-3" />
                                              {language === 'km' ? 'កូដលម្អិត' : 'Raw Code'}
                                           </button>
                                           <button 
                                              onClick={() => setEngineSubTab('diff')}
                                              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${engineSubTab === 'diff' ? 'bg-[#10b981] text-white shadow' : 'text-app-text-muted hover:text-app-text-dim'}`}
                                              title="View Difference with predecessor"
                                           >
                                              <Layers className="w-3 h-3" />
                                              {language === 'km' ? 'ប្រៀបធៀបគម្លាត' : 'Visual Diff'}
                                           </button>
                                        </div>
                                     </div>

                                     <div className="flex items-center gap-2">
                                        {/* Action reverting button if preview revision != currently active */}
                                        {previewRev.id !== selectedRevisionId ? (
                                           <button
                                              onClick={() => handleRevertToRevision(previewRev)}
                                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#3b82f6] hover:text-[#2563eb] border border-[#3b82f6]/30 hover:border-[#3b82f6] px-3 py-1.5 rounded-xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 transition-all"
                                           >
                                              <Undo2 className="w-3.5 h-3.5" />
                                              {language === 'km' ? 'ត្រឡប់ទៅជំនាន់នេះ' : 'Revert to this version'}
                                           </button>
                                        ) : (
                                           <span className="text-[10px] text-emerald-400 font-black uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl select-none">
                                              ● {language === 'km' ? 'ជំនាន់គំរូសកម្ម' : 'Active Scene Version'}
                                           </span>
                                        )}

                                        <button 
                                           onClick={() => {
                                              const code = engineView === 'jscad' ? (previewRev.jscadCode || '') : (previewRev.scadCode || '');
                                              copyToClipboard(code);
                                           }}
                                           className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#10b981] hover:text-[#059669] transition-all px-3 py-1.5 rounded-xl bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/25"
                                        >
                                           {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                                           {copied ? 'Copied' : 'Copy'}
                                        </button>
                                     </div>
                                  </div>

                                  {/* Viewer Window */}
                                  <div className="flex-1 p-0 overflow-auto custom-scrollbar font-mono bg-[#030406]">
                                     {engineSubTab === 'code' ? (
                                        <div className="py-4 font-mono text-[11px] sm:text-[12px]">
                                           {(engineView === 'jscad' ? (previewRev.jscadCode || '// NO JSCAD CODE') : (previewRev.scadCode || '// NO OPENSCAD CODE'))
                                              .split('\n')
                                              .map((line, lineIdx) => (
                                                 <div key={lineIdx} className="flex hover:bg-white/5 px-6 py-0.5 leading-relaxed">
                                                    <span className="w-12 text-right pr-4 text-app-text-muted shrink-0 select-none border-r border-[#1e293b]/40 mr-4 opacity-30">
                                                       {lineIdx + 1}
                                                    </span>
                                                    <span className="text-app-text-dim break-all whitespace-pre-wrap">
                                                       {line || ' '}
                                                    </span>
                                                 </div>
                                              ))
                                           }
                                        </div>
                                     ) : (
                                        /* DIFF MODE */
                                        <div className="py-4 font-mono text-[11px] sm:text-[12px]">
                                           {/* Brief instructions warning at the top of the diff */}
                                           <div className="px-6 mb-4 text-[10.5px] text-app-text-muted italic flex items-center gap-2 pb-3 border-b border-app-border/20">
                                              <span>
                                                 {(() => {
                                                    const prevNumIdx = revisions.findIndex(r => r.id === previewRev.id);
                                                    if (prevNumIdx > 0) {
                                                       const displayOldNum = prevNumIdx;
                                                       const displayNewNum = prevNumIdx + 1;
                                                       return language === 'km' 
                                                          ? `ប្រៀបធៀបគម្លាត៖ ជំនាន់ v${displayOldNum} ➔ ជំនាន់ v${displayNewNum} (ការផ្លាស់ប្តូរដែលបានស្នើឡើង)`
                                                          : `Visual diff comparison: v${displayOldNum} ➔ v${displayNewNum} (Changes introduced in this revision)`;
                                                    } else {
                                                       return language === 'km'
                                                          ? 'គំរូមូលដ្ឋាន៖ ការរចនាដំបូងបង្អស់'
                                                          : 'Base Version: Initial generated model code with all lines added';
                                                    }
                                                 })()}
                                              </span>
                                           </div>

                                           {(() => {
                                              const oldText = predecessor 
                                                 ? (engineView === 'jscad' ? (predecessor.jscadCode || '') : predecessor.scadCode)
                                                 : '';
                                              const newText = engineView === 'jscad' ? (previewRev.jscadCode || '') : previewRev.scadCode;

                                              const diffs = diffLines(oldText, newText);

                                              return diffs.map((diffLine, lineIdx) => {
                                                 const isAdded = diffLine.type === 'added';
                                                 const isRemoved = diffLine.type === 'removed';
                                                 
                                                 const bgClass = isAdded 
                                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 border-l-2 border-emerald-500' 
                                                    : isRemoved 
                                                       ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 border-l-2 border-rose-500' 
                                                       : 'hover:bg-white/5 text-app-text-dim border-l-2 border-transparent';

                                                 const oldLineNo = diffLine.lineNumberOld !== undefined ? diffLine.lineNumberOld : '';
                                                 const newLineNo = diffLine.lineNumberNew !== undefined ? diffLine.lineNumberNew : '';

                                                 return (
                                                    <div key={lineIdx} className={`flex px-6 py-0.5 ${bgClass} leading-relaxed`}>
                                                       {/* Old Line column */}
                                                       <span className="w-10 text-right pr-2 text-app-text-muted shrink-0 select-none opacity-30 text-[10px] py-0.5">
                                                          {oldLineNo}
                                                       </span>
                                                       {/* New Line column */}
                                                       <span className="w-10 text-right pr-4 text-app-text-muted shrink-0 select-none border-r border-[#1e293b]/40 mr-4 opacity-30 text-[10px] py-0.5">
                                                          {newLineNo}
                                                       </span>
                                                       {/* Code statement */}
                                                       <span className="break-all whitespace-pre-wrap select-text py-0.5">
                                                          {isAdded ? '+ ' : isRemoved ? '- ' : '  '}
                                                          {diffLine.text}
                                                       </span>
                                                    </div>
                                                 );
                                              });
                                           })()}
                                        </div>
                                     )}
                                  </div>
                               </>
                            );
                         })()}
                      </div>
                    </div>
                  ) : (activeTab as any) === 'engine_old_unused_safeguard' ? (
                   <div className="h-full bg-app-bg font-mono text-[13px] text-app-text selection:bg-[#264f78] custom-scrollbar flex flex-col">
                      <div className="p-4 border-b border-app-border flex items-center justify-between shrink-0">
                         <div className="flex bg-app-surface p-1 rounded-lg border border-app-border">
                            <button 
                              onClick={() => setEngineView('jscad')}
                              className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${engineView === 'jscad' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                               JSCAD
                            </button>
                            <button 
                              onClick={() => setEngineView('scad')}
                              className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${engineView === 'scad' ? 'bg-[#3b82f6] text-white shadow-lg' : 'text-app-text-muted hover:text-app-text'}`}
                            >
                               OpenSCAD
                            </button>
                         </div>
                         <button 
                           onClick={() => copyToClipboard(engineView === 'jscad' ? (currentJscad || '') : (currentScad || ''))}
                           className="flex items-center gap-2 text-[10px] font-bold uppercase text-app-text-muted hover:text-[#3b82f6] transition-all px-3 py-1.5 rounded-md hover:bg-app-surface"
                         >
                            {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                            {copied ? 'Copy' : 'Copy'}
                         </button>
                      </div>
                      <div className="flex-1 p-6 sm:p-10 overflow-auto">
                        <pre><code>{engineView === 'jscad' ? (currentJscad || '// NO JSCAD DATA') : (currentScad || '// NO OPENSCAD DATA')}</code></pre>
                      </div>
                   </div>
                 ) : activeTab === 'blueprint' ? (
                   <div className="h-full p-8 overflow-y-auto custom-scrollbar bg-app-bg">
                      <div className="max-w-3xl mx-auto pb-32">
                         <div className="flex items-center gap-4 mb-8">
                            <Layers className="w-6 h-6 text-[#3b82f6]" />
                            <h2 className="text-xl font-black text-app-text uppercase tracking-tight">{language === 'km' ? 'ប្លង់មេ និងការវិភាគ' : 'Blueprint & Analysis'}</h2>
                         </div>
                         <div className="bg-app-surface border border-app-border p-8 rounded-2xl text-[14px] leading-relaxed text-app-text-dim shadow-2xl">
                            {designAnalysis ? (
                               <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm`}>
                                  <ReactMarkdown>{designAnalysis}</ReactMarkdown>
                               </div>
                            ) : (
                               <p className="italic text-app-text-muted">No active design analysis. Describe something in Chat to generate a blueprint.</p>
                            )}
                         </div>
                      </div>
                   </div>
                ) : activeTab === 'detect' ? (
                  <VisionWorkspace 
                    language={language}
                    theme={theme}
                    isLoadingGlobal={isLoading}
                    onExtractModel={(prompt) => handleSend(prompt)}
                  />
                ) : activeTab === 'branding' ? (
                  <BrandingWorkspace 
                    language={language}
                    theme={theme}
                    currentModelName={selectedModel}
                    onInsertToChat={(imageUrl, promptText) => {
                      setSelectedImage(imageUrl);
                      setActiveTab('chat');
                      setInput(`Here is a generated branding visual asset: "${promptText}". Let's refine the 3D model or discuss how to adapt the design to fit this aesthetic!`);
                    }}
                  />
                ) : (
                  <div className="h-full p-8 overflow-y-auto custom-scrollbar">
                     <div className="max-w-3xl mx-auto pb-32">
                        <div className="flex items-center gap-4 mb-8">
                           <Settings className="w-6 h-6 text-[#3b82f6]" />
                           <h2 className="text-xl font-black text-app-text uppercase tracking-tight">{t.tweakerTitle}</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {modelParamSpecs.map((spec, i) => (
                              <div key={i} className="p-6 bg-app-surface rounded-2xl border border-app-border hover:border-[#3b82f6]/30 transition-all flex flex-col justify-between">
                                 <div className="flex justify-between mb-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">{spec.label}</label>
                                    <span className="text-[12px] font-mono text-[#3b82f6] font-bold">{modelParams[spec.name]}</span>
                                 </div>
                                 {spec.type === 'select' || spec.options ? (
                                    <select
                                       value={modelParams[spec.name] || spec.default}
                                       onChange={e => setModelParams(prev => ({ ...prev, [spec.name]: e.target.value }))}
                                       className="w-full bg-app-bg border border-app-border text-xs rounded-xl p-2.5 font-bold text-white tracking-wide cursor-pointer focus:border-[#3b82f6] outline-none"
                                    >
                                       {(spec.options || []).map((opt) => (
                                          <option key={opt} value={opt} className="bg-[#10121a] text-white">{opt}</option>
                                       ))}
                                    </select>
                                 ) : (
                                    <input 
                                       type="range" 
                                       min={spec.min} 
                                       max={spec.max} 
                                       step={spec.step || 1} 
                                       value={modelParams[spec.name] !== undefined ? modelParams[spec.name] : spec.default} 
                                       onChange={e => setModelParams(prev => ({ ...prev, [spec.name]: parseFloat(e.target.value) }))} 
                                       className="w-full h-1 bg-app-border rounded-full appearance-none cursor-pointer accent-[#3b82f6]" 
                                    />
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
             </div>
          </div>

           {/* Floating Bottom Prompt Bar */}
             {activeTab !== '3d' && (
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-30">
                <div className="bg-app-surface/80 backdrop-blur-2xl border border-app-border p-1.5 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-end gap-3 group focus-within:border-[#3b82f6] transition-all">
                   <button onClick={() => fileInputRef.current?.click()} className="p-3 text-app-text-muted hover:text-[#3b82f6] transition-colors"><ImageIcon className="w-6 h-6" /></button>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                   
                   <div className="flex-1 pb-1">
                      {selectedImage && (
                        <div className="relative w-16 h-16 mb-2">
                           <img src={selectedImage} className="w-full h-full object-cover rounded-xl border border-app-border" />
                           <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      )}
                      <textarea 
                        className="w-full bg-transparent border-none focus:ring-0 text-[15px] py-2 max-h-32 min-h-[44px] resize-none font-medium placeholder:text-app-text-muted text-app-text custom-scrollbar" 
                        placeholder="Describe your 3D component..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items;
                          if (!items) return;
                          for (const item of items) {
                            if (item.type.startsWith('image/')) {
                              const file = item.getAsFile();
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => setSelectedImage(event.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }
                          }
                        }}
                      />
                   </div>
                   
                   <button 
                    onClick={() => handleSend()}
                    disabled={isLoading || (!input.trim() && !selectedImage)}
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-6 py-3 rounded-xl disabled:opacity-10 transition-all font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-blue-900/30 active:scale-95 flex items-center gap-2"
                   >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Generate
                   </button>
                </div>
             </div>
             )}
        </main>
       </div>

       {/* Modals & Overlays */}
       <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-app-surface border border-app-border p-8 rounded-3xl w-full max-w-md shadow-2xl shadow-blue-500/20"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Engine Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 text-app-text-muted hover:text-app-text transition-all"><Trash2 className="w-5 h-5 rotate-45" /></button>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted block mb-4">Appearance</label>
                    <div className="grid grid-cols-2 gap-3 bg-app-surface p-1.5 rounded-2xl border border-app-border">
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${theme === 'dark' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-app-text-muted hover:text-app-text-dim'}`}
                      >
                        <Moon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Dark</span>
                      </button>
                      <button 
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${theme === 'light' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-app-text-muted hover:text-app-text-dim'}`}
                      >
                        <Sun className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Light</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted block mb-4">Processing Mode</label>
                    <div className="grid grid-cols-2 gap-3 bg-app-surface p-1.5 rounded-2xl border border-app-border">
                      <button 
                        onClick={() => setSelectedModel('gemini-3-flash-preview')}
                        className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${selectedModel === 'gemini-3-flash-preview' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-app-text-muted hover:text-app-text-dim'}`}
                      >
                        <RefreshCw className="w-4.5 h-4.5" />
                        <span className="text-[10px] font-black uppercase">Fast Mode</span>
                      </button>
                      <button 
                        onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                        className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-all ${selectedModel === 'gemini-3.1-pro-preview' ? 'bg-[#3b82f6] text-white shadow-xl shadow-blue-500/20' : 'text-app-text-muted hover:text-app-text-dim'}`}
                      >
                        <Cpu className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase">Smartest</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-app-text-muted mt-3 leading-relaxed italic">
                      {selectedModel === 'gemini-3-flash-preview' 
                        ? "Best for quick shapes and prototyping. Lower latency."
                        : "Extreme precision for complex assemblies. Higher token limits."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-app-border">
                    <button 
                      onClick={() => { setMessages([]); setCurrentJscad(null); setCurrentScad(null); setRevisions([]); setShowSettings(false); }}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Wipe Work Session
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showShortcuts && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
               className="fixed left-20 bottom-32 z-50 bg-app-bg border border-app-border p-6 rounded-2xl shadow-2xl w-64 backdrop-blur-xl"
            >
               <h4 className="text-[10px] font-black uppercase tracking-widest text-app-text mb-4">Global Shortcuts</h4>
               <div className="space-y-3">
                  {[
                    { key: 'Enter', action: 'Generate' },
                    { key: 'Shift+Enter', action: 'New Line' },
                    { key: 'Ctrl+Z', action: 'Undo' },
                    { key: 'Ctrl+Y', action: 'Redo' },
                    { key: 'Ctrl+S', action: 'Save Design' },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                       <span className="text-[11px] text-app-text-muted font-medium">{s.action}</span>
                       <kbd className="bg-app-surface border border-app-border px-2 py-0.5 rounded text-[10px] font-mono text-[#3b82f6]">{s.key}</kbd>
                    </div>
                  ))}
               </div>
            </motion.div>
          )}

          {showSaveNaming && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowSaveNaming(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-app-surface border border-app-border p-8 rounded-3xl w-full max-w-md shadow-2xl shadow-blue-500/10"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-xl font-black text-app-text uppercase tracking-tight mb-2">Save Blueprint</h3>
                <p className="text-[12px] text-app-text-muted mb-6 tracking-wide">Enter a name for your design to store it locally.</p>
                <input 
                  autoFocus
                  className="w-full bg-app-bg border border-app-border px-4 py-3 rounded-xl text-app-text outline-none focus:border-[#3b82f6] transition-all mb-6"
                  placeholder="e.g., UltraSonic Housing v1"
                  value={designName}
                  onChange={e => setDesignName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveDesign()}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowSaveNaming(false)} className="flex-1 py-3 text-[11px] font-black uppercase text-app-text-muted hover:text-app-text transition-all">Cancel</button>
                  <button onClick={handleSaveDesign} className="flex-1 py-3 bg-[#3b82f6] text-white rounded-xl text-[11px] font-black uppercase shadow-lg shadow-blue-900/30">Save Design</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showSavedList && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowSavedList(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-app-surface border border-app-border p-8 rounded-3xl w-full max-w-2xl shadow-2xl shadow-blue-500/10 max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Saved Blueprints</h3>
                    <p className="text-[12px] text-app-text-muted tracking-wide">Select a previous design to reload it.</p>
                  </div>
                  <button onClick={() => setShowSavedList(false)} className="p-2 text-app-text-muted hover:text-app-text transition-all"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {savedDesigns.length === 0 ? (
                    <div className="py-20 text-center opacity-20">
                      <Database className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest text-app-text">No Saved Blueprints</p>
                    </div>
                  ) : (
                    savedDesigns.map((d, i) => (
                      <div key={d.timestamp} className="group flex items-center gap-4 bg-app-bg border border-app-border p-4 rounded-2xl hover:border-[#3b82f6]/50 transition-all cursor-pointer" onClick={() => handleLoadDesign(d)}>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#3b82f6]">
                           <Box className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <p className="text-sm font-black text-app-text uppercase tracking-tight">{d.name}</p>
                           <p className="text-[10px] text-app-text-muted">{new Date(d.timestamp).toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteSaved(d.timestamp); }}
                          className="p-3 text-app-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-app-text-muted group-hover:text-[#3b82f6] transition-all" />
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {showChatCamera && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
              onClick={() => setShowChatCamera(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-app-surface border border-app-border p-6 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col gap-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#3b82f6]" />
                    <h3 className="text-md font-black text-app-text uppercase tracking-tight">
                      {language === 'km' ? 'ថតរូបភាពគំរូ' : 'Capture Reference Photo'}
                    </h3>
                  </div>
                  <button onClick={() => setShowChatCamera(false)} className="p-1 px-2.5 rounded bg-app-bg text-app-text-muted hover:text-white border border-app-border text-xs">
                    ✕
                  </button>
                </div>

                <div className="relative aspect-video bg-neutral-950 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                  {chatCameraError ? (
                    <div className="absolute inset-x-4 text-center text-red-400 text-xs flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                      <p>{chatCameraError}</p>
                    </div>
                  ) : (
                    <video 
                      ref={chatVideoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )}
                  
                  {!chatCameraError && (
                    <div className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded-full text-[9px] text-green-400 font-bold tracking-wider uppercase border border-green-400/20 animate-pulse">
                      <span className="w-1.5 h-1.5 inline-block rounded-full bg-green-400 mr-1.5" />
                      Ready to Capture
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => setShowChatCamera(false)} 
                    className="flex-1 py-3 border border-app-border hover:bg-neutral-800 text-app-text-muted hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                  >
                    {language === 'km' ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      if (chatVideoRef.current) {
                        const video = chatVideoRef.current;
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth || 640;
                        canvas.height = video.videoHeight || 480;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                          const dataUrl = canvas.toDataURL('image/jpeg');
                          setSelectedImage(dataUrl);
                          setLastUploadedImage(dataUrl);
                          setShowChatCamera(false);
                        }
                      }
                    }} 
                    disabled={!!chatCameraError || !chatCameraStream}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-900/30 transition-all"
                  >
                    {language === 'km' ? 'ថតរូបភាព' : 'Capture Photo'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
