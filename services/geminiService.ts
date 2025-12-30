
import { GoogleGenAI, Type } from "@google/genai";
import { ArticleAnalysis, SynthesisReport } from "../types";

const API_KEY = process.env.API_KEY || "";

const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

// Convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Remove the data URI prefix (e.g., "data:application/pdf;base64,")
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeArticle = async (file: File): Promise<ArticleAnalysis> => {
  const ai = getAIInstance();
  const base64Data = await fileToBase64(file);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: `Analise este artigo acadêmico rigorosamente e extraia as seguintes informações em Português:
            1. Título do Artigo
            2. Autores
            3. Ano de Publicação
            4. Problema/Lacuna (O que o artigo busca resolver?)
            5. Metodologia (Desenho, amostra, métodos)
            6. Achados Principais (Resultados diretos e significância)
            7. Crítica (Breve avaliação da robustez do estudo)
            
            Retorne os dados estritamente no formato JSON solicitado.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          authors: { type: Type.STRING },
          year: { type: Type.STRING },
          problem: { type: Type.STRING },
          methodology: { type: Type.STRING },
          findings: { type: Type.STRING },
          critique: { type: Type.STRING },
        },
        required: ["title", "authors", "year", "problem", "methodology", "findings", "critique"],
      },
    },
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    filename: file.name,
  };
};

export const generateFinalSynthesis = async (analyses: ArticleAnalysis[]): Promise<{ matrix: string, narrative: string, conflicts: string }> => {
  const ai = getAIInstance();
  
  const analysesText = analyses.map((a, i) => `
    Artigo ${i + 1}:
    Título: ${a.title}
    Objetivo/Problema: ${a.problem}
    Metodologia: ${a.methodology}
    Resultados: ${a.findings}
    Crítica: ${a.critique}
  `).join('\n\n');

  const prompt = `Com base nas análises individuais abaixo de vários artigos acadêmicos, gere:
  1. Uma MATRIZ DE SÍNTESE COMPARATIVA em formato de Tabela Markdown com as colunas: [Artigo (Título Curto)] | [Objetivo] | [Metodologia] | [Principais Resultados] | [Limitações/Gaps].
  2. Uma SÍNTESE NARRATIVA consolidando o conhecimento da área.
  3. Uma seção de CONFLITOS E DIVERGÊNCIAS, identificando onde os autores concordam e onde há discordâncias teóricas ou metodológicas.

  Mantenha um tom acadêmico rigoroso e use Idioma Português.

  ANÁLISES:
  ${analysesText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matrix: { type: Type.STRING, description: "Tabela Markdown da matriz" },
          narrative: { type: Type.STRING, description: "Texto da síntese narrativa" },
          conflicts: { type: Type.STRING, description: "Texto sobre conflitos e divergências" },
        },
        required: ["matrix", "narrative", "conflicts"],
      },
    }
  });

  return JSON.parse(response.text || "{}");
};
