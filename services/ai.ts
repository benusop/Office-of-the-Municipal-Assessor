
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API
// API Key is strictly obtained from process.env.API_KEY as requested.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface SummarizeResult {
  summary: string;
  tags: string[];
}

/**
 * Summarizes raw transaction notes and extracts system tags.
 */
export const summarizeTransactionNotes = async (rawNotes: string): Promise<SummarizeResult> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Analyze the following raw notes from a municipal assessor office transaction.
      1. Create a concise professional summary (max 2 sentences).
      2. Generate 3-5 relevant short system tags (e.g., "Urgent", "Transfer", "TaxDec").
      
      Raw Notes: "${rawNotes}"
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as SummarizeResult;
  } catch (error) {
    console.error("AI Summarization Error:", error);
    // Fallback if AI fails
    return {
      summary: rawNotes.substring(0, 100) + "...",
      tags: [" Manual Review Needed"]
    };
  }
};

/**
 * Proofreads text for grammar and spelling.
 */
export const proofreadText = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  
  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: `Fix the grammar and spelling of the following text. Maintain a professional tone. Return ONLY the corrected text. Text: "${text}"`
    });
    
    return response.text?.trim() || text;
  } catch (error) {
    console.error("AI Proofread Error:", error);
    return text;
  }
};
