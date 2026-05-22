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
  async generate3DCode(history: ChatMessage[], modelName: string = "gemini-2.5-flash-lite") {
    try {
      const recentHistory = history.slice(-6);
      const lastIndex = recentHistory.length - 1;
      const compactOldText = (text: string) => {
        const withoutCode = text.replace(/```[\s\S]*?```/g, '[previous code omitted]');
        return withoutCode.length > 2000 ? `${withoutCode.slice(0, 2000)}...` : withoutCode;
      };

      // Map history to the format expected by our backend (and raw API)
      const formattedHistory = recentHistory.map((msg, index) => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts.map(part => {
          if (part.text) return { text: index === lastIndex ? part.text : compactOldText(part.text) };
          if (part.inlineData) {
            return index === lastIndex ? { inlineData: part.inlineData } : { text: "[previous image omitted]" };
          }
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
        const errorMessage = typeof errData.error === 'string'
          ? errData.error
          : errData.error?.message || `Server responded with ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.text || "";
    } catch (error) {
      console.error("Gemini API Error in client:", error);
      throw error;
    }
  }

  async detectObjects(imageData: string, mimeType: string, modelName: string = "gemini-2.5-flash"): Promise<DetectionResponse> {
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
        const errorMessage = typeof errData.error === 'string'
          ? errData.error
          : errData.error?.message || `Server responded with ${response.status}`;
        throw new Error(errorMessage);
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
