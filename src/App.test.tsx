import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./services/geminiService', () => ({
  geminiService: {
    generate3DCode: vi.fn(),
    analyzeImage: vi.fn(),
    generateImage: vi.fn(),
  },
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  Float: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Grid: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  Stage: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./components/JscadRenderer', () => ({
  JscadRenderer: () => <div data-testid="jscad-renderer" />,
}));

describe('App', () => {
  it('renders the design workspace', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /untitled design_v1\.4/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/describe your 3d component/i)).toBeInTheDocument();
  });
});
