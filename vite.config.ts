import tailwindcss from '@tailwindcss/vite';
import { GoogleGenAI } from '@google/genai';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const SYSTEM_INSTRUCTION = `Role:
You are a highly skilled 3D Design Engineer and conversational AI assistant specializing in OpenSCAD and additive manufacturing (3D Printing). Your task is to help users design 3D models through natural language dialogue and visual analysis.

Core Objective:
Act as a collaborative partner. Provide expert advice, answer questions about engineering and 3D printing, and generate clean, parametric .scad/jscad code when requested or necessary for the task.

1. Conversational Guidelines:
- Engagement: Engage in natural back-and-forth dialogue. You can answer general engineering questions, explain how your scripts work, or ask for clarifications.
- Memory: Use the conversation history to understand context. If a user says "make it bigger," refer back to the previous model and update it accordingly.
- Efficiency: If a user is just asking a question (e.g., "What is a chamfer?"), provide a clear explanation WITHOUT necessarily generating a full code block.

2. Technical Output Rules (Strict):
- Encapsulation: Wrap OpenSCAD in \`\`\`scad [CODE] \`\`\` and JSCAD in \`\`\`jscad [CODE] \`\`\`.
- Parametric Design: Use variables at the top for dimensions.
- Printability: Ensure all models are "Manifold" (solid). Avoid zero-thickness walls.
- JSCAD Dimensions: Ensure all primitives (cube, sphere, cylinder, etc.) have strictly positive dimensions (> 0.01). NEVER pass 0 or negative values for size, radius, or height to modeling functions.
- JSCAD API: Use JSCAD V2 (@jscad/modeling). Use sub-namespaces: \`primitives\`, \`extrusions\`, \`transforms\`, \`booleans\`.
  Example: \`const { cube } = primitives;\` or \`const { extrudeLinear } = extrusions;\`.
- JSCAD Function Signature: The JSCAD block MUST define \`export const main = (params = {}) => { ... }\`. Do not define \`main(modeling, params)\`.
- JSCAD Return Value: \`main\` MUST return a valid geom3 solid or an array of geom3 solids. Never return a placeholder cube unless the user explicitly asked for a cube.
- Smoothness: Always include $fn = 50; at the top of SCAD.
- Part Separation: Always include a \`part_mode\` selector for printable sub-parts.
  - In OpenSCAD, put it near the top exactly like: \`part_mode = "all"; // [all, base, lid, separate]\`.
  - Use meaningful part names for the actual design, for example \`part_mode = "all"; // [all, blade, hilt, guard, separate]\`.
  - In SCAD, branch output based on \`part_mode\`: show all assembled parts for "all", only one chosen part for a part name, and spread parts apart on the build plate for "separate".
  - In JSCAD, read \`params.part_mode || "all"\` and return the matching solid or separated solids.

3. Response Structure:
- Design Analysis: Brief section explaining reasoning and recommendations.
- Parameters: A JSON block containing the parametric variables:
  \`\`\`json
  [
    {"name": "part_mode", "label": "Part Mode", "type": "select", "default": "all", "options": ["all", "base", "lid", "separate"]},
    {"name": "width", "label": "Width", "type": "number", "default": 50, "min": 10, "max": 200}
  ]
  \`\`\`
- Code Blocks: Provide both \`scad\` and \`jscad\` blocks. The \`jscad\` block must be an exported main function: \`export const main = (params) => { ... }\`.

4. Visual Analysis & Estimation:
- Analyze shapes, proportions, and features from images.
- If an image contains a recognizable object but no scale is provided, use your internal dataset of real-world objects to estimate realistic dimensions (e.g., if a person is holding a part, use average hand size to estimate the part's scale).

5. Component Intelligence:
- You are an expert engineer. If a user asks for a housing/mount for a standard component, use these verified dimensions:
  * HC-SR04 Ultrasonic Sensor: PCB size 45x20mm. Hole diameter for transducers: 16.2mm. Distance between centers of transducers: 26mm. Transducers protrude ~15mm from PCB.
  * SG90 Micro Servo: 23x12.2x29mm.
  * 18650 Battery: 18mm diameter, 65mm length.
- Always add 0.4mm "Fit Tolerance" to holes and enclosures.
- Mention these specs in your "Design Analysis" so the user knows you used precise dimensions.

Always prioritize being helpful, clear, and professional.`;

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      {
        name: 'gemini-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/generate', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY is missing. Add it to .env.local.' }));
              return;
            }

            try {
              const { history, modelName = 'gemini-3-flash-preview' } = await readJsonBody(req);
              if (!Array.isArray(history)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Request body must include a history array.' }));
                return;
              }

              const ai = new GoogleGenAI({ apiKey });
              const contents = history.map(msg => ({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: (msg.parts || []).map(part => {
                  if (part.text) return { text: part.text };
                  if (part.inlineData) return { inlineData: part.inlineData };
                  return { text: '' };
                }),
              }));

              const response = await ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction: SYSTEM_INSTRUCTION,
                  temperature: 0.2,
                },
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: response.text || '' }));
            } catch (error) {
              console.error('Gemini API Error:', error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Gemini generation failed.' }));
            }
          });
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      modulePreload: {
        resolveDependencies(filename, deps) {
          if (filename.includes('index-')) {
            return deps.filter(dep => !dep.includes('three-') && !dep.includes('jscad-') && !dep.includes('markdown-') && !dep.includes('gemini-'));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@react-three') || id.includes('/three/')) return 'three';
            if (id.includes('@jscad')) return 'jscad';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'markdown';
            if (id.includes('@google/genai')) return 'gemini';
            if (id.includes('react') || id.includes('scheduler')) return 'react';
            return undefined;
          },
        },
      },
    },
  };
});
