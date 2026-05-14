export interface ChatMessage {
  role: "user" | "model";
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

export class GeminiService {
  async generate3DCode(history: ChatMessage[], modelName: string = "gemini-3-flash-preview") {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history, modelName }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || `Gemini request failed with status ${response.status}`);
    }

    return payload?.text || "";
  }
}

export const geminiService = new GeminiService();
