export interface ChatMessage {
  role: "user" | "model";
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export interface DetectedObject {
  id: string;
  name: string;
  boundingBox: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  description: string;
  extractionPrompt: string;
}

export interface DetectionResponse {
  objects: DetectedObject[];
}

export class GeminiService {
  async generate3DCode(history: ChatMessage[], modelName: string = "gemini-3.5-flash") {
    try {
      // Map history to the format expected by our backend (and raw API)
      const formattedHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts.map(part => {
          if (part.text) return { text: part.text };
          if (part.inlineData) return { inlineData: part.inlineData };
          return { text: "" };
        })
      }));

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          history: formattedHistory,
          modelName
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      return data.text || "";
    } catch (error) {
      console.error("Gemini API Error in client:", error);
      throw error;
    }
  }

  async detectObjects(imageData: string, mimeType: string, modelName: string = "gemini-3.5-flash"): Promise<DetectionResponse> {
    try {
      const response = await fetch("/api/gemini/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageData,
          mimeType,
          modelName
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      return data as DetectionResponse;
    } catch (error) {
      console.error("Gemini API Object Detection Error in client:", error);
      throw error;
    }
  }

  async generateImage(prompt: string, aspectRatio: string = "1:1", model: string = "gemini-2.5-flash-image"): Promise<{ imageUrl: string; text?: string }> {
    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          model
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Gemini API Image Generation Error in client:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
