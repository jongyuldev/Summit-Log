import { GoogleGenAI, Type } from "@google/genai";
import { ClimbEntry, GearReview } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeProgression = async (climbs: ClimbEntry[]): Promise<string> => {
  try {
    const prompt = `
      You are an elite rock climbing coach with expertise in data analysis and performance training. 
      Analyze the provided climbing log to identify patterns, strengths, and areas for improvement.
      
      Climbing Data (Last 20 entries):
      ${JSON.stringify(climbs.slice(-20))}
      
      Please provide a structured response in Markdown covering:
      1. **Current Status**: A concise summary of recent progression, noting grade trends and send rates.
      2. **Performance Analysis**:
         - **Strengths**: Specific habits or metrics that are working well (e.g., "Consistent volume in V4-V5 range", "Good mix of indoor/outdoor").
         - **Weaknesses**: Potential gaps in the training (e.g., "Low success rate on sport routes vs bouldering", "Plateau at 5.11a", "Lack of volume").
      3. **Actionable Training Advice**:
         - Provide 2 specific, high-impact training drills or behavioral changes to implement immediately.
         - Explain *why* these specific actions will help address the identified weaknesses.
      
      Keep the tone encouraging, technical, and actionable. Avoid generic advice; use the data provided to justify your tips.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class climbing coach analyzing a student's logbook.",
        temperature: 0.7,
      }
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Error analyzing progression:", error);
    return "Sorry, I couldn't analyze your data right now. Please check your API key.";
  }
};

export const suggestGearReview = async (itemName: string, category: string, keyPoints: string): Promise<string> => {
  try {
    const prompt = `
      Write a short, helpful gear review for a rock climbing product.
      Product: ${itemName}
      Category: ${category}
      User Notes: ${keyPoints}
      
      The review should be about 50-75 words, balanced, and helpful for other climbers.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Error generating review:", error);
    return "";
  }
};

export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export const findPlaces = async (query: string): Promise<{ places: PlaceResult[], sourceUrl?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find climbing spots, gyms, or crags matching this query: "${query}". Return the top result with its name, latitude, longitude, and a very brief description.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              description: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    let places: PlaceResult[] = [];
    if (text) {
      try {
        places = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse places JSON", e);
      }
    }

    return { places, sourceUrl: '' };
  } catch (error) {
    console.error("Error finding places:", error);
    return { places: [] };
  }
};