import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as modeling from '@jscad/modeling';

interface JscadRendererProps {
  jscadCode: string | null;
  modelParams?: Record<string, any>;
  onError?: (error: string) => void;
}

export function JscadRenderer({ jscadCode, modelParams = {}, onError }: JscadRendererProps) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jscadCode) {
      setGeometry(null);
      setError(null);
      return;
    }

    try {
      const positiveKeys = [
        'size', 'radius', 'height', 'width', 'length', 
        'radiusStart', 'radiusEnd', 'innerRadius', 'outerRadius', 
        'roundRadius', 'thickness', 'depth', 'offset', 'expand', 'delta',
        'startRadius', 'endRadius'
      ];

      const sanitizeOptions = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => sanitizeOptions(item));

        const newObj = { ...obj };
        for (const key in newObj) {
          if (Object.prototype.hasOwnProperty.call(newObj, key)) {
            const val = newObj[key];
            if (typeof val === 'number') {
              if (positiveKeys.includes(key)) {
                (newObj as any)[key] = Math.max(0.001, val);
              } else if (key === 'segments' || key === 'facets' || key === 'resolution' || key === 'slices') {
                (newObj as any)[key] = Math.max(3, Math.floor(val));
              }
            } else if (Array.isArray(val) && positiveKeys.includes(key)) {
              (newObj as any)[key] = val.map(v => typeof v === 'number' ? Math.max(0.001, v) : v);
            } else if (typeof val === 'object' && val !== null) {
              (newObj as any)[key] = sanitizeOptions(val);
            }
          }
        }

        // Constraints for rounded primitives
        if ('roundRadius' in newObj && typeof newObj.roundRadius === 'number') {
          let maxAllowed = Infinity;
          if ('size' in newObj) {
            if (typeof newObj.size === 'number') maxAllowed = Math.min(maxAllowed, newObj.size / 2);
            else if (Array.isArray(newObj.size)) maxAllowed = Math.min(maxAllowed, ...newObj.size.map(s => typeof s === 'number' ? s / 2 : Infinity));
          }
          if ('radius' in newObj) {
            if (typeof newObj.radius === 'number') maxAllowed = Math.min(maxAllowed, newObj.radius);
            else if (Array.isArray(newObj.radius)) maxAllowed = Math.min(maxAllowed, ...newObj.radius.map(r => typeof r === 'number' ? r : Infinity));
          }
          
          if (newObj.roundRadius >= maxAllowed && maxAllowed !== Infinity) {
            newObj.roundRadius = Math.max(0.001, maxAllowed * 0.95);
          }
        }
        return newObj;
      };

      // Comprehensive wrapper for modeling sub-objects
      const wrapSubObject = (subObj: any): any => {
        if (!subObj || typeof subObj !== 'object') return subObj;
        const wrapped: any = {};
        Object.keys(subObj).forEach(key => {
          const original = subObj[key];
          if (typeof original === 'function') {
            wrapped[key] = (...args: any[]) => {
              try {
                const sanitizedArgs = args.map(arg => sanitizeOptions(arg));
                return original(...sanitizedArgs);
              } catch (e) {
                console.warn(`JSCAD Error in ${key}:`, e);
                // Return identity/empty if it fails
                if (key === 'union' || key === 'subtract' || key === 'intersect') return args[0];
                return modeling.primitives.cube({ size: 0.001 });
              }
            };
          } else if (typeof original === 'object' && original !== null) {
            wrapped[key] = wrapSubObject(original);
          } else {
            wrapped[key] = original;
          }
        });
        return wrapped;
      };

      const wrappedModeling = wrapSubObject(modeling);

      const candidates: string[] = ['main', 'defaultExport', 'Main', 'main_model', 'render'];
      if (jscadCode) {
        const funcDeclRegex = /\bfunction\s+([a-zA-Z0-9_]+)\s*\(/g;
        const varDeclRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/g;
        const funcExprRegex = /\b(?:const|let|var|export)\s+([a-zA-Z0-9_]+)\s*=\s*function/g;
        let match;
        while ((match = funcDeclRegex.exec(jscadCode)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
        while ((match = varDeclRegex.exec(jscadCode)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
        while ((match = funcExprRegex.exec(jscadCode)) !== null) {
          if (!candidates.includes(match[1]) && match[1] !== 'require' && match[1] !== 'modeling') {
            candidates.push(match[1]);
          }
        }
      }

      // We need to extract the main function and execute it
      // The AI is instructed to use require and export { main }
      const script = `
        var require = (pkg) => pkg === '@jscad/modeling' ? modeling : {};
        var module = { exports: {} };
        var exports = module.exports;
        
        // Expose top-level namespaces to avoid need for imports
        var { primitives, extrusions, transforms, booleans, colors, expansions, geometries, hulls, measurements, mathematics, utils } = modeling;

        ${jscadCode
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
      const result = mainFunc(wrappedModeling, modelParams);

      if (result) {
        setError(null);
        const geometries = Array.isArray(result) ? result : [result];
        const combinedGeometry = new THREE.BufferGeometry();
        
        let allPositions: number[] = [];
        let allNormals: number[] = [];

        geometries.forEach((geom: any) => {
          if (geom.polygons) {
            geom.polygons.forEach((polygon: any) => {
              const vertices = polygon.vertices;
              // Triangulate if more than 3 vertices (JSCAD polygons can be n-gons)
              // For simplicity, we use triangle fans as JSCAD polygons are convex
              for (let i = 1; i < vertices.length - 1; i++) {
                allPositions.push(...vertices[0], ...vertices[i], ...vertices[i+1]);
                
                // Normal calculation
                const v1 = new THREE.Vector3(...vertices[0]);
                const v2 = new THREE.Vector3(...vertices[i]);
                const v3 = new THREE.Vector3(...vertices[i+1]);
                const normal = new THREE.Vector3().crossVectors(
                  v2.clone().sub(v1),
                  v3.clone().sub(v1)
                ).normalize();
                
                allNormals.push(normal.x, normal.y, normal.z);
                allNormals.push(normal.x, normal.y, normal.z);
                allNormals.push(normal.x, normal.y, normal.z);
              }
            });
          }
        });

        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        setGeometry(combinedGeometry);
      }
    } catch (err: any) {
      console.error('JSCAD Render Error:', err);
      const msg = err?.message || 'Unknown render error';
      setError(msg);
      if (onError) onError(msg);
      setGeometry(null);
    }
  }, [jscadCode, modelParams, onError]);

  if (!geometry) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#333" wireframe opacity={0.2} transparent />
      </mesh>
    );
  }

  return (
    <group>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial 
          color="#3b82f6" 
          metalness={0.8} 
          roughness={0.1} 
          clearcoat={1}
          clearcoatRoughness={0.1}
          emissive="#1e40af"
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
