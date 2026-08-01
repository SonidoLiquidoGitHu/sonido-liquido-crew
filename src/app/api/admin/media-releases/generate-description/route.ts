// ===========================================
// AI DESCRIPTION GENERATOR FOR MEDIA RELEASES
// ===========================================
// Generates attractive descriptions and summaries for media releases
// using the z-ai-web-dev-sdk LLM.
//
// POST /api/admin/media-releases/generate-description
// Body: {
//   title: string,
//   artistName?: string,
//   category: string,
//   releaseType?: string,
//   releaseDate?: string,
//   tags?: string,
//   existingSummary?: string,
//   existingContent?: string,
// }
//
// Returns: {
//   success: true,
//   data: { summary: string, content: string, pullQuote: string }
// }

import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      artistName,
      category,
      releaseType,
      releaseDate,
      tags,
      existingSummary,
      existingContent,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "El título es requerido" },
        { status: 400 },
      );
    }

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const categoryLabels: Record<string, string> = {
      new_release: "Nuevo Lanzamiento",
      single: "Single",
      album: "Álbum",
      ep: "EP",
      tour: "Gira / Tour",
      collaboration: "Colaboración",
      event: "Evento",
      announcement: "Anuncio",
      interview: "Entrevista",
      feature: "Feature / Artículo",
    };

    const contextParts: string[] = [];
    contextParts.push(`Título: ${title}`);
    if (artistName) contextParts.push(`Artista: ${artistName}`);
    contextParts.push(`Categoría: ${categoryLabels[category] || category}`);
    if (releaseType) contextParts.push(`Tipo: ${releaseType}`);
    if (releaseDate) {
      const date = new Date(releaseDate).toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      contextParts.push(`Fecha: ${date}`);
    }
    if (tags) contextParts.push(`Tags: ${tags}`);
    if (existingSummary) contextParts.push(`Resumen existente: ${existingSummary}`);
    if (existingContent) contextParts.push(`Contenido existente: ${existingContent}`);

    const systemPrompt = `Eres un publicista experto de Sonido Líquido Crew, un colectivo de hip hop mexicano con más de 25 años de trayectoria. Generas textos atractivos para comunicados de prensa de medios.

REGLAS:
1. SIEMPRE escribe en español (es-MX).
2. SIEMPRE usa "años" con ñ, NUNCA "anos".
3. El tono debe ser profesional pero con sabor a calle, auténtico al hip hop mexicano.
4. Incluye contexto sobre el artista y el colectivo cuando sea relevante.
5. Menciona "Sonido Líquido Crew" o "SLC" al menos una vez.
6. NO uses emojis.

Genera 3 cosas:
- RESUMEN: 1-2 oraciones cortas para redes sociales (máximo 200 caracteres).
- CONTENIDO: 3-4 párrafos en Markdown para el comunicado completo. Incluye contexto del lanzamiento, info del artista, y por qué es relevante.
- CITA: Una cita destacada que los medios puedan usar (atribuida al artista o al colectivo).

Responde en formato JSON:
{"summary": "...", "content": "...", "pullQuote": "..."}`;

    const userPrompt = `Genera textos para este comunicado de prensa:

${contextParts.join("\n")}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      return NextResponse.json(
        { success: false, error: "La IA no generó respuesta" },
        { status: 500 },
      );
    }

    // Try to parse JSON from the response
    let parsed: { summary?: string; content?: string; pullQuote?: string };
    try {
      // Extract JSON from response (it might be wrapped in ```json blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // If JSON parsing fails, return the raw text as content
      parsed = {
        summary: aiResponse.substring(0, 200),
        content: aiResponse,
        pullQuote: "",
      };
    }

    // Fix "anos" → "años" everywhere
    const fixAnos = (text: string | undefined) =>
      text ? text.replace(/\banos\b/g, "años") : text;

    return NextResponse.json({
      success: true,
      data: {
        summary: fixAnos(parsed.summary) || "",
        content: fixAnos(parsed.content) || "",
        pullQuote: fixAnos(parsed.pullQuote) || "",
      },
    });
  } catch (error) {
    console.error("[AI Description] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error al generar descripción: ${(error as Error).message}`,
      },
      { status: 500 },
    );
  }
}
