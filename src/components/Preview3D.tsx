import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Environment, Float, Stage } from '@react-three/drei';
import { AlertTriangle, BoxSelect, Code as CodeIcon, Download, Loader2, Maximize2, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import { JscadRenderer } from './JscadRenderer';

function ModelPlaceholder({
  jscadCode,
  modelParams,
  onError
}: {
  jscadCode: string | null;
  modelParams: Record<string, any>;
  onError?: (err: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (meshRef.current && !jscadCode) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  if (jscadCode) {
    return (
      <group rotation={[Math.PI / 2, 0, 0]}>
        <JscadRenderer jscadCode={jscadCode} modelParams={modelParams} onError={onError} />
      </group>
    );
  }

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#007acc" wireframe />
      </mesh>
    </Float>
  );
}

export default function Preview3D({
  isProcessing,
  jscadCode,
  modelParams,
  onExportStl,
  onExportScad,
  showGrid,
  toggleGrid,
  onError,
  renderError,
  onRepair,
  t
}: {
  isProcessing: boolean;
  jscadCode: string | null;
  modelParams: Record<string, any>;
  onExportStl?: () => void;
  onExportScad?: () => void;
  showGrid: boolean;
  toggleGrid: () => void;
  onError?: (err: string | null) => void;
  renderError: string | null;
  onRepair?: () => void;
  t: any;
}) {
  return (
    <div className="w-full h-full bg-app-bg relative rounded-md overflow-hidden border border-app-border group">
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-[calc(100%-1.5rem)]">
        <div className="bg-app-surface/70 backdrop-blur-md px-3 py-1.5 rounded-md border border-app-border flex items-center gap-2 shadow-xl">
          <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-[#3b82f6] animate-pulse' : renderError ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className="text-[9px] font-bold text-app-text-dim uppercase tracking-widest">
            {isProcessing ? t.processing : renderError ? 'Error' : t.ready}
          </span>
        </div>
      </div>

      {!jscadCode && !isProcessing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-xs px-6">
            <div className="w-12 h-12 rounded-xl border border-app-border bg-app-surface/80 backdrop-blur-md flex items-center justify-center mx-auto mb-4 shadow-xl">
              <BoxSelect className="w-6 h-6 text-[#3b82f6]" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-app-text">Ready for a model</p>
            <p className="text-[11px] text-app-text-muted mt-2 leading-relaxed">Describe a part below or choose a library preset.</p>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-app-bg/45 backdrop-blur-[2px] px-4">
          <div className="bg-app-surface/90 border border-app-border rounded-xl px-5 py-4 shadow-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#3b82f6] shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-app-text">Generating geometry</p>
              <p className="text-[10px] text-app-text-muted mt-0.5">Building a renderable JSCAD solid...</p>
            </div>
          </div>
        </div>
      )}

      {renderError && !isProcessing && (
        <div className="absolute inset-x-3 sm:inset-x-4 top-14 z-30 bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-4 shadow-2xl backdrop-blur-md max-h-[45%] overflow-y-auto custom-scrollbar">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Render failed</p>
              <p className="text-[11px] leading-relaxed mt-1 text-red-100/90 break-words">{renderError}</p>
              {onRepair && (
                <button
                  onClick={onRepair}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Repair model
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 transition-all duration-200">
        <div className="bg-app-surface/80 backdrop-blur-sm p-1 rounded-md border border-app-border flex gap-1 shadow-2xl">
          <button
            onClick={onExportStl}
            disabled={!jscadCode || !!renderError}
            className="p-2 hover:bg-app-surface-hover rounded-md transition-all text-app-text-dim disabled:opacity-30"
            title="Export STL"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExportScad}
            disabled={!jscadCode}
            className="p-2 hover:bg-app-surface-hover rounded-md transition-all text-app-text-dim disabled:opacity-30"
            title="Export SCAD"
          >
            <CodeIcon className="w-3.5 h-3.5" />
          </button>
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

      <Canvas shadows dpr={[1, 1.5]} performance={{ min: 0.5 }}>
        <PerspectiveCamera makeDefault position={[15, 15, 15]} fov={45} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.2} shadows="contact">
            <ModelPlaceholder jscadCode={jscadCode} modelParams={modelParams} onError={onError} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} enableDamping />
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
