import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  Copy, 
  Cpu, 
  History, 
  Check, 
  Compass, 
  Share2, 
  RefreshCw, 
  ChevronRight,
  Monitor,
  Smartphone,
  Square,
  HelpCircle
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface BrandingWorkspaceProps {
  language: 'en' | 'km';
  theme: 'dark' | 'light';
  currentModelName?: string;
  onInsertToChat?: (imageUrl: string, promptText: string) => void;
}

interface SavedImage {
  id: string;
  prompt: string;
  url: string;
  aspectRatio: string;
  model: string;
  timestamp: number;
}

export function BrandingWorkspace({ language, theme, currentModelName, onInsertToChat }: BrandingWorkspaceProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savedAssets, setSavedAssets] = useState<SavedImage[]>([]);

  const t = {
    title: language === 'km' ? 'កម្មវិធីបង្កើតម៉ាកយីហោ និងទ្រព្យសកម្ម' : 'Branding & Visual Assets',
    description: language === 'km' ? 'បង្កើតនិមិត្តសញ្ញា គំនូសព្រាងប្លង់មេ និងសម្ភារៈផ្សព្វផ្សាយសម្រាប់គំរូ 3D របស់អ្នកដោយប្រើ Gemini API' : 'Generate logo marks, blueprint layouts, and promotional graphics for your 3D models using the Gemini API.',
    promptLabel: language === 'km' ? 'ការពិពណ៌នាអំពីទ្រព្យសកម្មរូបភាព' : 'Image Asset Description',
    placeholder: language === 'km' ? 'ពិពណ៌នាអំពីការរចនារូបភាពដែលអ្នកចង់បង្កើតលម្អិត...' : 'e.g., "A modern minimalist logo of a bracket joint, matte black finish on neon blue technical grid, vector art style"...',
    presetHeading: language === 'km' ? 'ស្ទីលការរចនាណែនាំ' : 'Branding Style Presets',
    generateBtn: language === 'km' ? 'បង្កើតទ្រព្យសកម្មរូបភាព' : 'Generate Visual Asset',
    generating: language === 'km' ? 'កំពុងបង្កើត...' : 'Generating Asset...',
    aspectRatioLabel: language === 'km' ? 'សមាមាត្ររូបភាព' : 'Aspect Ratio',
    modelLabel: language === 'km' ? 'Gemini ម៉ូដែលរូបភាព' : 'Gemini Vision Model',
    galleryHeading: language === 'km' ? 'សាលរូបភាពគម្រោងរបស់អ្នក' : 'Your Branding Gallery',
    noGallery: language === 'km' ? 'មិនមានរូបភាពដែលបានរក្សាទុកទេ' : 'Your gallery is empty. Generate assets above to populate it.',
    actions: {
      download: language === 'km' ? 'ទាញយក' : 'Download',
      copy: language === 'km' ? 'ចម្លង' : 'Copy link',
      copied: language === 'km' ? 'បានចម្លង!' : 'Copied!',
      share: language === 'km' ? 'ផ្ញើទៅការជជែក' : 'Send to Chat',
      shareSuccess: language === 'km' ? 'បានបញ្ចូលទៅក្នុងជជែក' : 'Inserted into discussion',
    }
  };

  const loadingMessages = [
    language === 'km' ? 'កំពុងចាប់ផ្តើមគូររូប...' : 'Initializing visual canvas...',
    language === 'km' ? 'កំពុងគណនាពន្លឺនិងទិសដៅ...' : 'Calculating studio lighting paths...',
    language === 'km' ? 'កំពុងកំណត់រចនាប័ទ្មលម្អិត...' : 'Refining vector textures & geometry...',
    language === 'km' ? 'កំពុងបង្កើនកម្រិតភាពច្បាស់...' : 'Polishing detail contrast & shadows...',
    language === 'km' ? 'កំពុងរៀបចំការទាញយករូបភាព...' : 'Assembling final render bytes...'
  ];

  // Rotate loading message
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load saved assets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('design_branding_assets');
      if (stored) {
        setSavedAssets(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load branding assets tracker", e);
    }
  }, []);

  const presets = [
    {
      title: language === 'km' ? 'និមិត្តសញ្ញាបច្ចេកវិទ្យា' : 'Minimalist Vector Logo',
      prompt: 'A modern minimalist vector logo representing advanced mechanical engineering, clean white lines on deep matte charcoal background, high contrast, golden accent line, isometric technical symmetry, high render detail.',
      category: 'logo',
    },
    {
      title: language === 'km' ? 'ប្លង់មេនាពេលអនាគត' : 'Futuristic Tech Blueprint',
      prompt: 'Sleek dark blue futuristic wireframe schematic blueprint of a sophisticated modular mechanism, architectural grids, vector layout, subtle HUD neon cyan annotations, clean rendering on dark background.',
      category: 'blueprint',
    },
    {
      title: language === 'km' ? 'រូបថតផលិតផល' : 'Studio Product Showcase',
      prompt: 'A stunning studio product photograph of a premium custom-manufactured hardware tool assembly resting elegantly on a minimalist modern ceramic podium, dramatic focus, hard side lighting, soft volumetric shadows.',
      category: 'product',
    },
    {
      title: language === 'km' ? 'រចនាប្រអប់ម៉ាកយីហោ' : 'Tactile Packaging Concept',
      prompt: 'Industrial brand box packaging design laying flat on craft paper backdrop, elegant bold typography, minimal color block layout of green and concrete slate, premium tactile aesthetic.',
      category: 'packaging',
    }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setLoadingMessageIndex(0);

    try {
      const response = await geminiService.generateImage(prompt, aspectRatio, selectedModel);
      
      setCurrentImage(response.imageUrl);
      if (response.text) {
        setCurrentText(response.text);
      }

      // Automatically add to local storage assets
      const newAsset: SavedImage = {
        id: 'img_' + Math.random().toString(36).substr(2, 9),
        prompt: prompt,
        url: response.imageUrl,
        aspectRatio: aspectRatio,
        model: selectedModel,
        timestamp: Date.now()
      };

      const updated = [newAsset, ...savedAssets];
      setSavedAssets(updated);
      localStorage.setItem('design_branding_assets', JSON.stringify(updated));

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate branding asset. Please verify Gemini configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imgUrl: string, namePrefix: string) => {
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = `${namePrefix.toLowerCase().replaceAll(' ', '_')}_asset.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = (imgUrl: string) => {
    navigator.clipboard.writeText(imgUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertChat = (url: string, assetPrompt: string) => {
    if (onInsertToChat) {
      onInsertToChat(url, assetPrompt);
    }
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAssets.filter(item => item.id !== id);
    setSavedAssets(updated);
    localStorage.setItem('design_branding_assets', JSON.stringify(updated));
    if (currentImage && savedAssets.find(i => i.id === id)?.url === currentImage) {
      setCurrentImage(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8" id="branding-workspace-container">
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-6" id="branding-header">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#3b82f6]">
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Brand AI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-app-text tracking-tight uppercase">{t.title}</h1>
            <p className="text-xs text-app-text-muted max-w-2xl">{t.description}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                // Pre-populate with something interesting based on current models if any
                const target = "Mechanical print design";
                setPrompt(`Expert level blueprints schematic and premium branding package for high performance ${target}, clean geometric logo vector icon combined with high-fashion aesthetic box cover render`);
              }}
              className="px-3 py-1.5 rounded-xl bg-app-surface hover:bg-[#3b82f6]/10 text-app-text-muted hover:text-[#3b82f6] border border-app-border transition-all text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              Auto Draft Prompt
            </button>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="branding-layout-grid">
          
          {/* Controls Panel (Left side) */}
          <div className="lg:col-span-7 space-y-6" id="branding-controls-side">
            
            {/* Aspect Ratio & Model Selection */}
            <div className="bg-app-surface/40 backdrop-blur-md rounded-2xl border border-app-border p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Aspect Ratio picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted block">
                    {t.aspectRatioLabel}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1:1', icon: <Square className="w-3.5 h-3.5" />, desc: 'Square' },
                      { id: '16:9', icon: <Monitor className="w-3.5 h-3.5" />, desc: 'Banner' },
                      { id: '9:16', icon: <Smartphone className="w-3.5 h-3.5 animate-rotate-90-off" />, desc: 'Stories' },
                      { id: '4:3', icon: <div className="w-4 h-3 border border-current rounded-sm"></div>, desc: 'Preview' },
                      { id: '3:4', icon: <div className="w-3 h-4 border border-current rounded-sm"></div>, desc: 'Portrait' },
                    ].map(aspect => (
                      <button 
                        key={aspect.id}
                        onClick={() => setAspectRatio(aspect.id)}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all ${aspectRatio === aspect.id ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' : 'bg-app-bg border-app-border text-app-text-muted hover:text-app-text'}`}
                      >
                        {aspect.icon}
                        <span className="text-[8px] font-black uppercase">{aspect.id}</span>
                        <span className="text-[7px] text-app-text-muted uppercase leading-none opacity-60">{aspect.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted block">
                    {t.modelLabel}
                  </label>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', speed: 'Fast & Expressive' },
                      { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', speed: 'Ultra-High Details' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${selectedModel === m.id ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-app-text' : 'bg-app-bg border-app-border text-app-text-muted hover:text-app-text'}`}
                      >
                        <Cpu className={`w-4 h-4 mt-0.5 ${selectedModel === m.id ? 'text-[#3b82f6]' : 'text-app-text-muted'}`} />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-tight leading-normal">{m.name}</p>
                          <span className="text-[8px] text-[#3b82f6] font-bold uppercase">{m.speed}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Prompt Box */}
            <div className="bg-app-surface/40 backdrop-blur-md rounded-2xl border border-app-border p-5 space-y-4 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-app-text-muted flex justify-between">
                  <span>{t.promptLabel}</span>
                  <span className="text-right text-app-text-muted hover:text-app-text cursor-pointer" onClick={() => setPrompt('')}>Clear</span>
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={t.placeholder}
                    className="w-full bg-app-bg border border-app-border focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] rounded-2xl p-4 text-xs font-semibold custom-scrollbar placeholder:text-app-text-muted/65 text-app-text resize-none transition-all"
                  />
                  
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 py-1 px-2.5 rounded-full text-[#3b82f6] text-[8px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Gemini AI
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all shadow-lg ${
                  isGenerating || !prompt.trim() 
                    ? 'bg-app-surface border border-app-border text-app-text-muted cursor-not-allowed'
                    : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-blue-500/10'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    {t.generating}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4.5 h-4.5" />
                    {t.generateBtn}
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-bold uppercase tracking-tight">
                  {error}
                </div>
              )}
            </div>

            {/* Prompt Presets list */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-app-text-muted px-1">{t.presetHeading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(preset.prompt)}
                    className="p-4 text-left bg-app-surface/40 hover:bg-[#3b82f6]/5 border border-app-border hover:border-[#3b82f6]/40 rounded-2xl transition-all group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-tight group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        {preset.title}
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                    <p className="text-[10px] text-app-text-muted leading-relaxed line-clamp-2 italic">"{preset.prompt}"</p>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Results Side (Right Side) */}
          <div className="lg:col-span-5 flex flex-col" id="branding-result-side">
            <div className="h-full bg-app-surface/40 backdrop-blur-md border border-app-border rounded-3xl p-6 flex flex-col justify-between shadow-sm min-h-[480px]">
              
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="generating"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center p-8 space-y-4"
                    >
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#3b82f6]/30 animate-spin" style={{ animationDuration: '10s' }} />
                        <div className="absolute inset-2 rounded-full border-4 border-[#3b82f6] border-t-transparent animate-spin" />
                        <div className="absolute inset-4 rounded-full bg-app-bg flex items-center justify-center text-[#3b82f6]">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-black uppercase tracking-widest text-[#3b82f6] animate-pulse">
                          Creating Masterpiece
                        </p>
                        <p className="text-[10px] text-app-text-muted italic min-h-[1.5rem]">
                          {loadingMessages[loadingMessageIndex]}
                        </p>
                      </div>
                    </motion.div>
                  ) : currentImage ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full flex flex-col justify-center space-y-4"
                    >
                      {/* Interactive Checkerboard container */}
                      <div className="relative group rounded-2xl overflow-hidden border border-app-border bg-checkerboard shadow-xl flex items-center justify-center max-h-[380px] bg-slate-950/20">
                        <img 
                          src={currentImage} 
                          alt="Gemini Visual Asset"
                          referrerPolicy="no-referrer"
                          className="w-full h-full max-h-[360px] object-contain transition-all duration-500 group-hover:scale-[1.02]"
                        />
                        
                        {/* Copy success badge */}
                        <AnimatePresence>
                          {copied && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-1.5"
                            >
                              <Check className="w-4 h-4" />
                              {t.actions.copied}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Display prompt string */}
                      {currentText && (
                        <div className="p-3.5 bg-app-bg/50 border border-app-border rounded-xl">
                          <p className="text-[10px] font-mono text-app-text-muted leading-relaxed line-clamp-3">
                            {currentText}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      className="text-center p-12 text-app-text-muted/60 flex flex-col items-center gap-4"
                    >
                      <div className="w-16 h-16 rounded-3xl bg-app-bg border border-app-border flex items-center justify-center text-app-text-muted/50">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-app-text">Visual Canvas Empty</p>
                        <p className="text-[10px] max-w-xs leading-normal">Enter an image prompt on the left to dream up corporate graphics, decals or technical sketches with artificial intelligence.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons underneath rendering */}
              {currentImage && (
                <div className="grid grid-cols-3 gap-2.5 mt-6 border-t border-app-border/60 pt-5">
                  <button 
                    onClick={() => handleDownload(currentImage, prompt.substring(0, 15))}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl bg-app-bg hover:bg-[#3b82f6]/10 text-app-text-muted hover:text-[#3b82f6] border border-app-border transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase tracking-wider">{t.actions.download}</span>
                  </button>
                  <button 
                    onClick={() => handleCopyLink(currentImage)}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl bg-app-bg hover:bg-[#3b82f6]/10 text-app-text-muted hover:text-[#3b82f6] border border-app-border transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase tracking-wider">
                      {copied ? t.actions.copied : t.actions.copy}
                    </span>
                  </button>
                  <button 
                    onClick={() => handleInsertChat(currentImage, prompt)}
                    className="flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30 text-[#3b82f6] transition-all"
                  >
                    <Share2 className="w-4 h-4 animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-wider">{t.actions.share}</span>
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Gallery list persisted tracker */}
        <div className="space-y-4 pt-4" id="branding-gallery-section">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#3b82f6]" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-app-text">{t.galleryHeading}</h3>
            <span className="px-2 py-0.5 rounded-full bg-app-surface text-[8px] font-black text-app-text-muted uppercase">
              {savedAssets.length} Assets
            </span>
          </div>

          {savedAssets.length === 0 ? (
            <div className="p-12 text-center bg-app-surface/20 border border-dashed border-app-border rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted leading-relaxed">
                {t.noGallery}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {savedAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  onClick={() => {
                    setCurrentImage(asset.url);
                    setPrompt(asset.prompt);
                    setAspectRatio(asset.aspectRatio);
                  }}
                  className={`group relative aspect-square bg-app-surface rounded-2xl border transition-all overflow-hidden cursor-pointer ${currentImage === asset.url ? 'border-[#3b82f6] ring-2 ring-[#3b82f6]/20' : 'border-app-border hover:border-[#3b82f6]/50'}`}
                >
                  <img 
                    src={asset.url} 
                    alt={asset.prompt} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                  />
                  
                  {/* Aspect Ratio tag floating */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[8px] font-black text-white uppercase scale-90">
                    {asset.aspectRatio}
                  </span>

                  {/* Dark hover layer with prompt brief & actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all p-3 flex flex-col justify-between">
                    <button 
                      onClick={(e) => handleDeleteSaved(asset.id, e)}
                      className="self-end p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105"
                      title="Delete asset"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <p className="text-[8px] font-semibold text-white/90 line-clamp-2 leading-snug">
                      "{asset.prompt}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
