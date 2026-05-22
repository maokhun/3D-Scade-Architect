import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const PORT = Number(process.env.PORT || 3000);

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in .env.local or deployment secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `Role:
You are a highly skilled 3D Design Engineer and conversational AI assistant specializing in OpenSCAD and additive manufacturing (3D Printing). Your task is to help users design 3D models through natural language dialogue and visual analysis.

Core Objective:
Act as a highly skilled collaborative partner. Your goal is to provide expert engineering advice and generate production-ready, parametric .scad and jscad code. When a user requests a model, you MUST perform a "Deep Design Analysis": think meticulously about the functional requirements, structural integrity, and additive manufacturing constraints. Even if the user's description is brief or incomplete, you are expected to proactively design all necessary components (e.g., if asked for an "electronic enclosure", you must consider wall thickness, ventilation, cable management, internal mounting points, and assembly features like sliding drawers or snap-fit lids) to create a professional, industrial-grade engineering solution.

1. Conversational Guidelines:
- Engineering Depth: Analyze the user's intent. Suggest improvements like fillets for stress reduction, chamfers for easier assembly, or tolerances for moving parts.
- Proactive Design: Don't just follow the prompt literally. Ask yourself: "What else does this object need to be truly functional and professional?" (e.g., mounting holes, interlocking tabs, or reinforcement ribs).
- Engagement: Engage in natural back-and-forth dialogue. Explain the engineering choices you made.
- Language: Respond in English or the user's preferred language (e.g., Khmer).
- Memory: Use the conversation history to understand context.
- Efficiency: If a user is just asking a question, provide a clear explanation without necessarily generating code.

2. Technical Output Rules (Strict):
- JSCAD Block: The JSCAD block is CRITICAL for the live browser preview; ALWAYS provide it alongside the SCAD code.
- Encapsulation: Wrap OpenSCAD in \`\`\`scad [CODE] \`\`\` and JSCAD in \`\`\`jscad [CODE] \`\`\`.
- Parametric Design: Use variables at the top for all dimensions, wall thicknesses, and tolerances.
- Printability: Ensure all models are "Manifold" and optimized for 3D printing (minimizing supports, considering bridge lengths and overhangs).
- JSCAD Dimensions: Use strictly positive dimensions. Use \`Math.max(0.1, ...)\` for safety during calculations.
- JSCAD Boolean Operations: Ensure subtractors are slightly larger than the target face to prevent 0-thickness "ghost" skins (z-fighting).
- JSCAD API: Use JSCAD V2 (@jscad/modeling). Use sub-namespaces: \`primitives\`, \`extrusions\`, \`transforms\`, \`booleans\`.
  Example: \`const { cube } = primitives;\` or \`const { extrudeLinear } = extrusions;\`.
- Part Separation & Parallel Layout: Always include a \`part_mode\` variable defaulting to "all" (options: all, base, lid, separate) in both codebases. When 'separate' is chosen, you MUST modify the JSCAD and OpenSCAD code to layout the lid and base side-by-side in the same XY plane (Z=0) without any vertical stacking or elevation, following the A || B alignment rule to ensure both parts touch the print bed. NEVER stack them, nest them, or leave any parts floating in mid-air in "separate" mode. Both the base and the lid must touch the Z=0 plane and remain parallel/coplanar. This applies to both OpenSCAD and JSCAD code. Always include $fn = 50; at the top of the OpenSCAD code for edge smoothness.

3. Response Structure:
- Design Analysis: A detailed section explaining your reasoning, the components you added for better functionality, and 3D printing recommendations.
- Parameters: A JSON block containing the parametric variables. You MUST consistently include "part_mode" as a select parameter alongside standard physical variables:
  \`\`\`json
  [
    {"name": "width", "label": "Width", "type": "number", "default": 50, "min": 10, "max": 200},
    {"name": "part_mode", "label": "Part Mode", "type": "select", "default": "all", "options": ["all", "base", "lid", "separate"]}
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

const QUICK_SYSTEM_INSTRUCTION = `${SYSTEM_INSTRUCTION}

Quick Mode Overrides:
- Keep the design analysis short: maximum 5 concise bullets.
- Generate a practical first version quickly instead of an exhaustive industrial design.
- Still include the required JSON parameters, OpenSCAD block, and JSCAD block.
- Keep both code blocks compact and avoid extra decorative details unless the user explicitly asks for them.`;

function getLastUserPrompt(history: any[] = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "user") {
      const text = (history[i].parts || [])
        .map((part: any) => part?.text || "")
        .filter(Boolean)
        .join(" ");
      if (text.trim()) return text.trim();
    }
  }
  return "A simple 3D printable enclosure with a lid.";
}

function buildFallback3DResponse(history: any[] = []) {
  const prompt = getLastUserPrompt(history).slice(0, 240);
  return `Design Analysis:
Gemini is temporarily busy, so I generated a reliable fallback parametric project box from your request: "${prompt}". This model includes a printable base, wall thickness, a separate lid, and part_mode controls so you can preview all parts, base only, lid only, or separated parts on the print bed.

Parameters:
\`\`\`json
[
  {"name": "width", "label": "Width", "type": "number", "default": 80, "min": 30, "max": 180},
  {"name": "depth", "label": "Depth", "type": "number", "default": 55, "min": 30, "max": 160},
  {"name": "height", "label": "Height", "type": "number", "default": 28, "min": 15, "max": 90},
  {"name": "wall", "label": "Wall Thickness", "type": "number", "default": 2.4, "min": 1.2, "max": 5},
  {"name": "lid_thickness", "label": "Lid Thickness", "type": "number", "default": 3, "min": 1.5, "max": 8},
  {"name": "part_mode", "label": "Part Mode", "type": "select", "default": "all", "options": ["all", "base", "lid", "separate"]}
]
\`\`\`

\`\`\`scad
$fn = 50;
width = 80;
depth = 55;
height = 28;
wall = 2.4;
lid_thickness = 3;
fit = 0.35;
part_mode = "all"; // [all, base, lid, separate]

module base() {
  difference() {
    cube([width, depth, height], center=false);
    translate([wall, wall, wall])
      cube([width - 2*wall, depth - 2*wall, height], center=false);
  }
  translate([wall + fit, wall + fit, height - wall])
    difference() {
      cube([width - 2*(wall + fit), depth - 2*(wall + fit), wall], center=false);
      translate([wall, wall, -0.1])
        cube([width - 4*wall - 2*fit, depth - 4*wall - 2*fit, wall + 0.2], center=false);
    }
}

module lid() {
  cube([width, depth, lid_thickness], center=false);
  translate([wall + fit, wall + fit, lid_thickness])
    cube([width - 2*(wall + fit), depth - 2*(wall + fit), wall], center=false);
}

if (part_mode == "base") {
  base();
} else if (part_mode == "lid") {
  lid();
} else if (part_mode == "separate") {
  base();
  translate([width + 15, 0, 0]) lid();
} else {
  base();
  translate([0, 0, height + 2]) lid();
}
\`\`\`

\`\`\`jscad
export const main = (params = {}) => {
  const { cuboid } = primitives;
  const { translate } = transforms;
  const { subtract, union } = booleans;

  const width = Math.max(30, params.width ?? 80);
  const depth = Math.max(30, params.depth ?? 55);
  const height = Math.max(15, params.height ?? 28);
  const wall = Math.max(1.2, params.wall ?? 2.4);
  const lidThickness = Math.max(1.5, params.lid_thickness ?? 3);
  const fit = 0.35;
  const mode = params.part_mode || "all";

  const box = (size, pos) => translate(pos, cuboid({ size }));

  const baseOuter = box([width, depth, height], [width / 2, depth / 2, height / 2]);
  const baseInner = box(
    [Math.max(1, width - 2 * wall), Math.max(1, depth - 2 * wall), height],
    [width / 2, depth / 2, wall + height / 2]
  );
  const baseShell = subtract(baseOuter, baseInner);
  const rimOuter = box(
    [Math.max(1, width - 2 * (wall + fit)), Math.max(1, depth - 2 * (wall + fit)), wall],
    [width / 2, depth / 2, height - wall / 2]
  );
  const rimInner = box(
    [Math.max(1, width - 4 * wall - 2 * fit), Math.max(1, depth - 4 * wall - 2 * fit), wall + 0.2],
    [width / 2, depth / 2, height - wall / 2]
  );
  const basePart = union(baseShell, subtract(rimOuter, rimInner));

  const lidPlate = box([width, depth, lidThickness], [width / 2, depth / 2, lidThickness / 2]);
  const lidPlug = box(
    [Math.max(1, width - 2 * (wall + fit)), Math.max(1, depth - 2 * (wall + fit)), wall],
    [width / 2, depth / 2, lidThickness + wall / 2]
  );
  const lidPart = union(lidPlate, lidPlug);

  if (mode === "base") return basePart;
  if (mode === "lid") return lidPart;
  if (mode === "separate") return [basePart, translate([width + 15, 0, 0], lidPart)];
  return [basePart, translate([0, 0, height + 2], lidPart)];
};
\`\`\``;
}

async function startServer() {
  const app = express();

  // Allow larger payloads for camera images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Generate Code
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { history, modelName } = req.body;
      const client = getGeminiClient();
      const requestedModel = modelName || "gemini-2.5-flash-lite";
      const quickMode = requestedModel.includes("lite");
      const fallbackModels = [requestedModel, "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      const modelsToTry = [...new Set(fallbackModels)];
      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          const response = await client.models.generateContent({
            model,
            contents: history,
            config: {
              systemInstruction: quickMode ? QUICK_SYSTEM_INSTRUCTION : SYSTEM_INSTRUCTION,
              temperature: quickMode ? 0.35 : 0.5,
              ...(quickMode ? { maxOutputTokens: 8192 } : {}),
            },
          });

          return res.json({ text: response.text || "", model });
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.error?.code;
          const message = String(err?.message || "");
          const retryable = status === 429 || status === 503 || message.includes("UNAVAILABLE") || message.includes("high demand");
          if (!retryable) break;
        }
      }

      const status = lastError?.status || lastError?.error?.code;
      const message = String(lastError?.message || "");
      const canUseFallback = status === 429 || status === 503 || message.includes("UNAVAILABLE") || message.includes("high demand");
      if (canUseFallback) {
        return res.json({
          text: buildFallback3DResponse(history),
          model: "local-fallback",
          warning: "Gemini is temporarily busy, so a local fallback model was generated."
        });
      }

      throw lastError;
    } catch (err: any) {
      console.error("Generate API Error:", err);
      const status = err?.status || err?.error?.code || 500;
      const message = String(err?.message || "");
      const friendlyMessage = status === 503 || message.includes("UNAVAILABLE") || message.includes("high demand")
        ? "Gemini is currently busy. Please wait a moment and try again."
        : err.message || "An error occurred with Gemini.";
      res.status(status === 429 || status === 503 ? status : 500).json({ error: friendlyMessage });
    }
  });

  // API Route: Object Detection
  app.post("/api/gemini/detect", async (req, res) => {
    try {
      const { imageData, mimeType, modelName } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "No image data provided" });
      }

      const client = getGeminiClient();
      const actualModel = modelName || "gemini-2.5-flash";

      const promptPart = {
        text: `You are an expert computer vision system and 3D modeling assistant.
Look closely at this image. Your task is to identify and detect specific distinct, individual physical objects that would be excellent candidates for extraction and reconstruction into parametric 3D printable designs (JSCAD/OpenSCAD).
Examples include: mechanical parts, brackets, containers, tools, electronic housings, geometric shapes, figurines, furniture, etc.

For each object you detect:
1. Locate its bounding box. Bounding box coordinates MUST be represented as percentages of the image size from 0 to 100: ymin, xmin, ymax, xmax.
   - ymin: Distance from top edge (0 to 100)
   - xmin: Distance from left edge (0 to 100)
   - ymax: Distance from bottom edge (0 to 100)
   - xmax: Distance from right edge (0 to 100)
   Ensure these percentages are highly accurate relative to the boundary of the object in the image.
2. Estimate the object's physical dimensions (width, depth, height) in millimeters based on real-world cues and hand scales.
3. Formulate a highly detailed, engineering-style "extractionPrompt" that specifies how to generate a 3D model of that object (including wall thickness, assembly attributes, chamfers/fillets, features).

Respond strictly with valid JSON following the provided schema. Do not include markdown code ticks like \`\`\`json in your response, just return the raw JSON object itself.`
      };

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageData // base64 payload
        }
      };

      const response = await client.models.generateContent({
        model: actualModel,
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objects: {
                type: Type.ARRAY,
                description: "List of identified distinct 3D-printable or structural objects in the image",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "A unique short alphanumeric ID for this object (e.g., obj1, obj2)" },
                    name: { type: Type.STRING, description: "Display name of the object" },
                    boundingBox: {
                      type: Type.OBJECT,
                      properties: {
                        ymin: { type: Type.NUMBER, description: "Top boundary from 0 to 100 (percentage)" },
                        xmin: { type: Type.NUMBER, description: "Left boundary from 0 to 100 (percentage)" },
                        ymax: { type: Type.NUMBER, description: "Bottom boundary from 0 to 100 (percentage)" },
                        xmax: { type: Type.NUMBER, description: "Right boundary from 0 to 100 (percentage)" }
                      },
                      required: ["ymin", "xmin", "ymax", "xmax"]
                    },
                    dimensions: {
                      type: Type.OBJECT,
                      properties: {
                        width: { type: Type.NUMBER, description: "Estimated physical width in mm" },
                        depth: { type: Type.NUMBER, description: "Estimated physical depth/length in mm" },
                        height: { type: Type.NUMBER, description: "Estimated physical height in mm" }
                      },
                      required: ["width", "depth", "height"]
                    },
                    description: { type: Type.STRING, description: "Short assessment of its geometry and shape" },
                    extractionPrompt: { type: Type.STRING, description: "An engineering-focused drafting prompt to generate a 3D model of this object in JSCAD/OpenSCAD" }
                  },
                  required: ["id", "name", "boundingBox", "dimensions", "description", "extractionPrompt"]
                }
              }
            },
            required: ["objects"]
          }
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error("Detect API Error:", err);
      res.status(500).json({ error: err.message || "An error occurred with Gemini." });
    }
  });

  // API Route: Generate Image
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "1:1", model = "gemini-2.5-flash-image" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      const client = getGeminiClient();

      const response = await client.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      let base64Image = null;
      let responseText = "";

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            base64Image = `data:image/png;base64,${part.inlineData.data}`;
          } else if (part.text) {
            responseText += part.text;
          }
        }
      }

      if (!base64Image) {
        throw new Error("No image was returned by Gemini. Response: " + responseText);
      }

      res.json({ imageUrl: base64Image, text: responseText });
    } catch (err: any) {
      console.error("Generate Image API Error:", err);
      res.status(500).json({ error: err.message || "An error occurred during image generation." });
    }
  });

  // Vite Integration
  const isProduction = process.env.NODE_ENV === "production" || process.env.npm_lifecycle_event === "start";

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
