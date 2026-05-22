import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configuration secrets in Settings > Secrets.");
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

      const response = await client.models.generateContent({
        model: modelName || "gemini-3.5-flash",
        contents: history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.5,
        },
      });

      res.json({ text: response.text || "" });
    } catch (err: any) {
      console.error("Generate API Error:", err);
      res.status(500).json({ error: err.message || "An error occurred with Gemini." });
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
      const actualModel = modelName || "gemini-3.5-flash";

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
  if (process.env.NODE_ENV !== "production") {
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
