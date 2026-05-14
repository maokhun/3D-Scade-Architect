import { useEffect, useState } from 'react';
import * as THREE from 'three';
import * as modeling from '@jscad/modeling';
import { executeJscad } from '../utils/jscadExecutor';

interface JscadRendererProps {
  jscadCode: string | null;
  modelParams?: Record<string, any>;
  onError?: (error: string | null) => void;
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
      const result = executeJscad(jscadCode, modelParams, modeling);

      if (result) {
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

        if (allPositions.length === 0) {
          throw new Error('Generated JSCAD did not return a 3D solid.');
        }

        combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
        combinedGeometry.computeBoundingBox();
        combinedGeometry.computeBoundingSphere();
        setError(null);
        if (onError) onError(null);
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
    return null;
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
