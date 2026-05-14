/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Send, 
  Download, 
  Image as ImageIcon, 
  Trash2, 
  ChevronRight, 
  Code as CodeIcon,
  Loader2,
  Monitor,
  Layers,
  Cpu,
  ArrowDown,
  Settings,
  RefreshCw,
  Save,
  Command,
  HelpCircle,
  Package,
  Wrench,
  Database,
  Wind,
  Undo2,
  Redo2,
  FolderOpen,
  Moon,
  Sun,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ChatMessage } from './services/geminiService';

const Preview3D = lazy(() => import('./components/Preview3D'));
const ReactMarkdown = lazy(() => import('react-markdown'));

function PreviewFallback() {
  return (
    <div className="h-full w-full bg-app-bg border border-app-border rounded-md flex items-center justify-center">
      <div className="flex items-center gap-3 text-app-text-muted">
        <Loader2 className="w-4 h-4 animate-spin text-[#3b82f6]" />
        <span className="text-[10px] font-black uppercase tracking-widest">Loading 3D engine</span>
      </div>
    </div>
  );
}

function MarkdownView({ children }: { children: string }) {
  return (
    <Suspense fallback={<span>{children}</span>}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </Suspense>
  );
}

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

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentScad, setCurrentScad] = useState<string | null>(null);
  const [currentJscad, setCurrentJscad] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'engine' | 'blueprint' | 'params' | '3d'>('chat');
  const [lastUploadedImage, setLastUploadedImage] = useState<string | null>(null);
  const [conceptImages, setConceptImages] = useState<{prompt: string, url: string}[]>([]);
  const [designAnalysis, setDesignAnalysis] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'gemini-3-flash-preview' | 'gemini-3.1-pro-preview'>('gemini-3-flash-preview');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isDesktopInspector, setIsDesktopInspector] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('3d_architect_theme');
    if (savedTheme === 'light') setTheme('light');
  }, []);

  useEffect(() => {
    localStorage.setItem('3d_architect_theme', theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsDesktopInspector(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [modelParams, setModelParams] = useState<Record<string, any>>({});
  const [modelParamSpecs, setModelParamSpecs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'km'>('en');

  // History & Persistence
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedDesigns, setSavedDesigns] = useState<{ name: string; timestamp: number; data: any }[]>([]);
  const [showSavedList, setShowSavedList] = useState(false);
  const [showSaveNaming, setShowSaveNaming] = useState(false);
  const [designName, setDesignName] = useState('New Design');

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
    setGenerationError(null);
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
      const { geminiService } = await import('./services/geminiService');
      const response = await geminiService.generate3DCode([...messages, newUserMessage], selectedModel);
      
      if (!response) throw new Error("Empty response from AI.");

      const assistantMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: response }]
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Extract code
      const scadMatch = response.match(/```scad([\s\S]*?)```/i);
      if (scadMatch) setCurrentScad(scadMatch[1].trim());

      const jscadMatch = response.match(/```(?:jscad|javascript|js)([\s\S]*?)```/i);
      if (jscadMatch) setCurrentJscad(jscadMatch[1].trim());

      // Extract parameters
      const paramsMatch = response.match(/```json([\s\S]*?)```/i);
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
      setGenerationError(error?.message || 'Failed to generate model');
      setActiveTab('chat');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleRepairModel = () => {
    if (!currentJscad || isLoading) return;
    const repairPrompt = `The current JSCAD failed to render with this error: ${renderError || 'unknown render error'}.

Rewrite the design as valid JSCAD V2 using @jscad/modeling. Return a complete response with a short design analysis, a JSON parameters block, a SCAD block, and a JSCAD block. The JSCAD main function must be export const main = (params = {}) => { ... } and it must return a valid 3D solid.

Current broken JSCAD:
\`\`\`jscad
${currentJscad}
\`\`\``;
    handleSend(repairPrompt);
  };

  const handleRerender = () => {
    if (!currentJscad) return;
    const code = currentJscad;
    setRenderError(null);
    setCurrentJscad(null);
    requestAnimationFrame(() => setCurrentJscad(code));
  };

  const exportStl = async () => {
    if (!currentJscad) return;
    try {
      const jscadStlSerializer = await import('@jscad/stl-serializer');
      const mod = await import('@jscad/modeling');
      
      const serialize = jscadStlSerializer.serialize;
      
        const script = `
        var require = (pkg) => pkg === '@jscad/modeling' ? modeling : {};
        var module = { exports: {} };
        var exports = module.exports;
        var { primitives, extrusions, transforms, booleans, colors, expansions, geometries, hulls, measurements, mathematics, utils } = modeling;
        ${currentJscad
          .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
          .replace(/\bmodule\.exports\s*=\s*\{\s*main\s*\};?/g, 'exports.main = main;')
          .replace(/\bexport\s+default\s+/g, 'var defaultExport = ')
          .replace(/\bexport\s+(const|let|var)\s+/g, 'var ')
          .replace(/\bexport\s+function\s+/g, 'function ')
          .replace(/\bexport\s+class\s+/g, 'class ')
          .replace(/\bexport\s+\{[\s\S]*?\};?/g, '')
          .replace(/\bconst\b/g, 'var')
          .replace(/\blet\b/g, 'var')
        }
        var finalMain = typeof main !== 'undefined' ? main : (typeof defaultExport !== 'undefined' ? defaultExport : (typeof exports.main !== 'undefined' ? exports.main : (typeof module.exports === 'function' ? module.exports : (typeof module.exports.main !== 'undefined' ? module.exports.main : (typeof exports.default !== 'undefined' ? exports.default : null)))));
        if (typeof finalMain !== 'function') throw new Error('JSCAD main function not found');
        return finalMain.length >= 2 ? finalMain(modeling, modelParams) : finalMain(modelParams);
      `;

      const mainFunc = new Function('modeling', 'modelParams', script);
      const result = mainFunc(mod, modelParams);
      
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
    <div className={`flex h-dvh bg-app-bg text-app-text-dim ${language === 'km' ? 'font-khmer' : 'font-sans'} overflow-hidden select-none ${theme === 'light' ? 'light' : ''}`}>
       {/* Slim Tool Sidebar */}
       <div className="flex w-12 sm:w-16 border-r border-app-border flex-col items-center py-3 sm:py-6 bg-app-bg gap-4 sm:gap-8 shrink-0">
          <div className="p-2 sm:p-2.5 bg-[#3b82f6] rounded-xl shadow-lg shadow-blue-500/20">
             <Box className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex flex-col gap-2 sm:gap-4">
             <button 
               onClick={() => setExpandedCategory(expandedCategory ? null : PART_LIBRARY[0].category)}
               className={`p-2.5 sm:p-3 rounded-xl transition-all ${expandedCategory ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="Components Library"
             >
               <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
             <button 
               onClick={() => setShowShortcuts(!showShortcuts)}
               className={`p-2.5 sm:p-3 rounded-xl transition-all ${showShortcuts ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="Keyboard Shortcuts"
             >
               <Command className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
             <button 
               onClick={() => setShowSettings(true)}
               className={`p-2.5 sm:p-3 rounded-xl transition-all ${showSettings ? 'bg-[#11131a] text-[#3b82f6]' : 'text-[#52525b] hover:text-[#3b82f6] hover:bg-[#11131a]'}`}
               title="System Settings"
             >
               <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
          </div>
          <div className="mt-auto flex flex-col gap-2 sm:gap-4">
             <button className="p-2.5 sm:p-3 rounded-xl hover:bg-app-surface text-app-text-muted hover:text-app-text transition-all"><HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" /></button>
             <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold">MK</div>
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

      <AnimatePresence>
        {expandedCategory && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="lg:hidden fixed left-12 top-0 bottom-0 z-40 w-[min(320px,calc(100vw-3rem))] bg-app-bg border-r border-app-border shadow-2xl overflow-y-auto custom-scrollbar"
          >
            <div className="p-4 border-b border-app-border flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">{t.library}</h2>
              <button onClick={() => setExpandedCategory(null)} className="p-2 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface">
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {PART_LIBRARY.map((entry, i) => (
                <div key={i} className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === entry.category ? PART_LIBRARY[0].category : entry.category)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className={`p-2 rounded-lg ${entry.color}`}>
                      {entry.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-app-text truncate">{entry.category}</p>
                      <p className="text-[9px] text-app-text-muted mt-0.5">{entry.prompts.length} Modules</p>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform text-app-text-muted ${expandedCategory === entry.category ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedCategory === entry.category && (
                    <div className="px-3 pb-3 space-y-1">
                      {entry.prompts.map((p, j) => (
                        <button
                          key={j}
                          onClick={() => { setExpandedCategory(null); setInput(p.prompt); handleSend(p.prompt); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-app-surface-hover group flex items-center gap-2 transition-all"
                        >
                          <div className="w-1 h-1 rounded-full bg-app-border group-hover:bg-[#3b82f6]" />
                          <span className="text-[11px] font-medium text-app-text-muted group-hover:text-app-text transition-colors">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-app-bg relative">
        <header className="min-h-14 border-b border-app-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-6 py-2 sm:py-0 shrink-0 bg-app-bg z-20">
           <div className="flex w-full sm:w-auto min-w-0 items-center gap-2 sm:gap-6 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <h1 className={`font-black text-xs sm:text-sm tracking-widest text-app-text uppercase truncate max-w-[150px] sm:max-w-none ${language === 'km' ? 'font-khmer-title' : 'font-sans'}`}>Untitled Design_v1.4</h1>
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

              <div className="order-3 sm:order-none w-full sm:w-auto flex items-center gap-1 bg-app-surface p-1 rounded-lg overflow-x-auto scrollbar-hide">
                {[
                  { id: '3d', label: language === 'km' ? '3D' : '3D View' },
                  { id: 'chat', label: language === 'km' ? 'ជជែក' : 'Chat' },
                  { id: 'engine', label: language === 'km' ? 'កូដ' : 'Engine' },
                  { id: 'blueprint', label: language === 'km' ? 'ប្លង់មេ' : 'Blueprint' },
                  { id: 'params', label: language === 'km' ? 'កែសម្រួល' : 'Params' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`shrink-0 px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-[#3b82f6] text-white shadow-sm border border-[#3b82f6]' : 'text-app-text-muted hover:text-app-text-dim'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="flex w-full sm:w-auto items-center justify-end gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
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
                className="flex items-center gap-2 bg-app-surface hover:bg-app-surface-hover disabled:opacity-20 text-app-text-dim px-3 sm:px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-app-border shrink-0"
              >
                 <CodeIcon className="w-4 h-4" />
                 <span className="hidden sm:inline">SCAD</span>
              </button>
              <button 
                onClick={exportStl} 
                disabled={!currentJscad}
                className="flex items-center gap-2 bg-[#fbbf24] hover:bg-[#f59e0b] disabled:opacity-20 text-black px-3 sm:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 shrink-0"
              >
                 <Download className="w-4 h-4" />
                 <span className="hidden sm:inline">STL</span>
              </button>
           </div>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
           <div className="flex-1 relative">
             {/* Large Central Canvas */}
             <div className="h-full w-full">
                 {activeTab === '3d' ? (
                   <Suspense fallback={<PreviewFallback />}>
                     <Preview3D 
                      isProcessing={isLoading} 
                      jscadCode={currentJscad} 
                      modelParams={modelParams}
                      onExportStl={exportStl} 
                      onExportScad={exportScad}
                      showGrid={showGrid}
                       toggleGrid={() => setShowGrid(!showGrid)}
                       renderError={renderError} 
                       onError={setRenderError} 
                       onRepair={handleRepairModel}
                       t={t}
                     />
                   </Suspense>
                ) : activeTab === 'chat' ? (
                   <div className="h-full overflow-y-auto bg-app-bg custom-scrollbar p-4 sm:p-8 relative" onScroll={handleScroll}>
                      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-36 sm:pb-32">
                         {messages.length === 0 && !isLoading && (
                            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-10">
                              <div className="mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-app-surface border border-app-border text-[10px] font-black uppercase tracking-widest text-[#3b82f6] mb-5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  AI CAD workspace
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-app-text">Generate precise 3D parts from plain language.</h2>
                                <p className="text-app-text-muted text-sm mt-3 max-w-xl leading-relaxed">Start with a mechanical part, enclosure, mount, or upload a reference image. The app will generate editable JSCAD, parameters, and a live 3D preview.</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                  'A wall-mounted enclosure with screw holes and a snap-fit lid',
                                  'A reinforced L bracket with countersunk holes',
                                  'A 608 bearing block with mounting slots'
                                ].map(example => (
                                  <button
                                    key={example}
                                    onClick={() => handleSend(example)}
                                    className="text-left p-4 rounded-xl bg-app-surface border border-app-border hover:border-[#3b82f6]/50 hover:bg-app-surface-hover transition-all group"
                                  >
                                    <p className="text-[11px] font-bold leading-relaxed text-app-text-dim group-hover:text-app-text">{example}</p>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                         )}
                         {messages.map((m, i) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                               <div className={`p-4 sm:p-6 rounded-2xl max-w-[92%] sm:max-w-[85%] text-[13px] sm:text-[14px] leading-relaxed border shadow-2xl ${m.role === 'user' ? 'bg-[#3b82f6] border-[#2563eb] text-white font-medium' : 'bg-app-surface border-app-border text-app-text-dim'}`}>
                                  <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm`}>
                                    <MarkdownView>{m.parts.map(p => p.text).join('')}</MarkdownView>
                                  </div>
                               </div>
                            </motion.div>
                         ))}
                         {generationError && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                               <div className="max-w-[85%] bg-red-500/10 border border-red-500/25 rounded-2xl p-5 shadow-2xl">
                                  <div className="flex items-start gap-3">
                                     <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                     <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Generation failed</p>
                                       <p className="text-[13px] text-red-100/90 mt-1 leading-relaxed">{generationError}</p>
                                     </div>
                                  </div>
                               </div>
                            </motion.div>
                         )}
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
                     <AnimatePresence>
                        {showScrollBottom && (
                           <motion.button
                              initial={{ opacity: 0, scale: 0.8, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 10 }}
                              onClick={() => scrollToBottom()}
                              className="fixed bottom-36 left-1/2 -translate-x-1/2 z-40 bg-[#3b82f6] text-white p-3 rounded-full shadow-2xl hover:bg-[#2563eb] transition-all hover:scale-110 active:scale-95 border border-white/20"
                           >
                              <ArrowDown className="w-5 h-5" />
                           </motion.button>
                        )}
                     </AnimatePresence>
                  </div>
                ) : activeTab === 'engine' ? (
                    <div className="h-full bg-app-bg p-4 sm:p-10 font-mono text-[12px] sm:text-[13px] overflow-auto text-app-text selection:bg-[#264f78] custom-scrollbar">
                      <pre><code>{currentJscad || '// NO DESIGN DATA GENERATED'}</code></pre>
                   </div>
                 ) : activeTab === 'blueprint' ? (
                   <div className="h-full p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-app-bg">
                      <div className="max-w-3xl mx-auto pb-32">
                         <div className="flex items-center gap-4 mb-8">
                            <Layers className="w-6 h-6 text-[#3b82f6]" />
                            <h2 className="text-xl font-black text-app-text uppercase tracking-tight">{language === 'km' ? 'ប្លង់មេ និងការវិភាគ' : 'Blueprint & Analysis'}</h2>
                         </div>
                          <div className="bg-app-surface border border-app-border p-5 sm:p-8 rounded-2xl text-[13px] sm:text-[14px] leading-relaxed text-app-text-dim shadow-2xl">
                            {designAnalysis ? (
                               <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-sm`}>
                                   <MarkdownView>{designAnalysis}</MarkdownView>
                               </div>
                            ) : (
                               <p className="italic text-app-text-muted">No active design analysis. Describe something in Chat to generate a blueprint.</p>
                            )}
                         </div>
                      </div>
                   </div>
                ) : (
                  <div className="h-full p-4 sm:p-8 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto pb-36 sm:pb-32">
                       <div className="flex items-center gap-4 mb-8">
                          <Settings className="w-6 h-6 text-[#3b82f6]" />
                          <h2 className="text-xl font-black text-app-text uppercase tracking-tight">{t.tweakerTitle}</h2>
                       </div>
                       {modelParamSpecs.length === 0 ? (
                         <div className="bg-app-surface border border-app-border rounded-2xl p-6 sm:p-10 text-center">
                           <Settings className="w-8 h-8 text-app-text-muted mx-auto mb-4" />
                           <p className="text-[11px] font-black uppercase tracking-widest text-app-text">{t.noParams}</p>
                           <p className="text-[12px] text-app-text-muted mt-2">Generate a parametric model to unlock live sliders.</p>
                         </div>
                       ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {modelParamSpecs.map((spec, i) => (
                             <div key={i} className="p-6 bg-app-surface rounded-2xl border border-app-border hover:border-[#3b82f6]/30 transition-all">
                                <div className="flex justify-between mb-4">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted">{spec.label}</label>
                                   <span className="text-[12px] font-mono text-[#3b82f6] font-bold">{modelParams[spec.name]}</span>
                                </div>
                                <input type="range" min={spec.min} max={spec.max} step={spec.step || 1} value={modelParams[spec.name]} onChange={e => setModelParams(prev => ({ ...prev, [spec.name]: parseFloat(e.target.value) }))} className="w-full h-1 bg-app-border rounded-full appearance-none cursor-pointer accent-[#3b82f6]" />
                             </div>
                          ))}
                       </div>
                       )}
                    </div>
                  </div>
                )}
             </div>

             {/* Floating Bottom Prompt Bar */}
             <div className="absolute bottom-3 sm:bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-3 sm:px-6 z-30">
                <div className="bg-app-surface/90 sm:bg-app-surface/80 backdrop-blur-2xl border border-app-border p-1.5 rounded-xl sm:rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] flex items-end gap-1.5 sm:gap-3 group focus-within:border-[#3b82f6] transition-all">
                   <button onClick={() => fileInputRef.current?.click()} className="p-2.5 sm:p-3 text-app-text-muted hover:text-[#3b82f6] transition-colors shrink-0"><ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                   
                   <div className="flex-1 pb-1 min-w-0">
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
                    className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 sm:px-6 py-3 rounded-xl disabled:opacity-10 transition-all font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-blue-900/30 active:scale-95 flex items-center gap-2 shrink-0"
                   >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="hidden sm:inline">Generate</span>
                   </button>
                </div>
             </div>
           </div>

           {/* Right Panel: Global Inspector / Preview */}
           {isDesktopInspector && (
           <div className="w-[380px] bg-app-bg border-l border-app-border flex flex-col shrink-0">
              <div className="p-6 border-b border-app-border flex items-center justify-between">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Live Preview</h2>
                 <div className="flex gap-1.5 font-mono text-[9px] text-app-text-muted">
                    <span className="text-emerald-500">60FPS</span>
                    <span>•</span>
                    <span>WEB_GL_2.0</span>
                 </div>
              </div>
              <div className="flex-1 p-4">
                 <div className="h-[280px] w-full rounded-2xl overflow-hidden border border-app-border bg-black shadow-inner">
                    <Suspense fallback={<PreviewFallback />}>
                      <Preview3D 
                        isProcessing={isLoading} 
                        jscadCode={currentJscad} 
                        modelParams={modelParams}
                        onExportStl={exportStl} 
                        onExportScad={exportScad}
                        showGrid={showGrid}
                        toggleGrid={() => setShowGrid(!showGrid)}
                        renderError={renderError} 
                        onError={setRenderError} 
                        onRepair={handleRepairModel}
                        t={t}
                      />
                    </Suspense>
                 </div>

                 <div className="mt-8 space-y-6">
                    <div>
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-app-text-muted mb-4">Structural Analysis</h3>
                       <div className="bg-app-surface border border-app-border p-5 rounded-2xl text-[12px] leading-relaxed text-app-text-dim shadow-xl overflow-y-auto max-h-[300px] custom-scrollbar">
                          {designAnalysis ? (
                            <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''} prose-xs`}>
                              <MarkdownView>{designAnalysis}</MarkdownView>
                            </div>
                          ) : (
                            <p className="italic text-app-text-muted">Generating structural request results...</p>
                          )}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setActiveTab('3d')} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-app-surface border border-app-border hover:border-[#3b82f6]/40 transition-all">
                          <Monitor className="w-5 h-5 text-[#3b82f6]" />
                          <span className="text-[9px] font-bold uppercase text-app-text-muted">Fullscreen</span>
                       </button>
                       <button onClick={handleRerender} disabled={!currentJscad} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-app-surface border border-app-border hover:border-[#3b82f6]/40 transition-all disabled:opacity-30">
                          <RefreshCw className="w-5 h-5 text-amber-500" />
                          <span className="text-[9px] font-bold uppercase text-app-text-muted">Re-render</span>
                       </button>
                    </div>
                 </div>
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
                        <RefreshCw className={`w-5 h-5 ${selectedModel === 'gemini-3-flash-preview' ? 'animate-spin-slow' : ''}`} />
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
                      onClick={() => { setMessages([]); setCurrentJscad(null); setCurrentScad(null); setShowSettings(false); }}
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
                  <button onClick={() => setShowSavedList(false)} className="p-2 text-app-text-muted hover:text-app-text transition-all"><Trash2 className="w-5 h-5 rotate-45" /></button>
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
       </AnimatePresence>
    </div>
  );
}
