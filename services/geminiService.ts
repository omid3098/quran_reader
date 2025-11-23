import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const searchQuran = async (query: string): Promise<SearchResult[]> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `You are a knowledgeable Quran assistant. 
    The user is searching for: "${query}".
    Identify up to 5 most relevant Quran verses. 
    Return a list of objects.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  surah: { type: Type.INTEGER },
                  ayah: { type: Type.INTEGER },
                  context: {
                    type: Type.STRING,
                    description: "A very brief 5-10 word reason why this matches.",
                  },
                },
                required: ["surah", "ayah", "context"],
              },
            },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    // Clean possible markdown fences
    const cleanText = jsonText.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleanText);
    return parsed.results || [];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

export const explainAyah = async (
  surahName: string,
  surahNum: number,
  ayahNum: number,
  ayahText: string
): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Provide a concise, spiritual, and easy-to-understand Tafseer (explanation) for Quran Surah ${surahName} (${surahNum}), Ayah ${ayahNum}.
    The translation text is: "${ayahText}".
    Keep the explanation under 150 words. Focus on the core message and practical application.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Could not generate explanation.";
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return "Sorry, I couldn't fetch the explanation at this time.";
  }
};
