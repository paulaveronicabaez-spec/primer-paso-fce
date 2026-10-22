import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * HU8 · Sugerencia de postulantes con IA (solo para la Prosecretaría).
 * Recibe la búsqueda y los candidatos ANÓNIMOS (sin nombre, DNI ni correo) y devuelve hasta 5 ordenados.
 * Si no hay ANTHROPIC_API_KEY configurada, responde 501 y la aplicación usa la sugerencia por reglas.
 */
export const runtime = "nodejs";

interface Candidato { codigo: string; carrera: string | null; avance: number | null; avance_verificado: boolean; perfil_test: string; perfil_relacionado: string; competencias: string[]; perfil_segun_test: string; afinidad_reglas: number }

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "sin_ia" }, { status: 501 });

  // Solo la Prosecretaría puede pedir sugerencias (se valida con su sesión de Supabase)
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: rol } = await sb.rpc("mi_rol");
  if (!token || (rol as { rol?: string } | null)?.rol !== "pro") return NextResponse.json({ error: "no_autorizado" }, { status: 403 });

  const { busqueda, candidatos } = (await req.json()) as { busqueda: Record<string, unknown>; candidatos: Candidato[] };
  if (!Array.isArray(candidatos) || !candidatos.length) return NextResponse.json({ items: [] });

  const prompt = `Sos asistente de la Prosecretaría de Inserción Laboral de la FCE (UNLP). Elegí hasta 5 postulantes para enviar a la organización, ordenados del más al menos recomendable.
Búsqueda: ${JSON.stringify(busqueda)}
Postulantes (todos cumplen los requisitos formales; datos anónimos):
${JSON.stringify(candidatos.slice(0, 40))}
Criterios: coincidencia de competencias y perfil vocacional con lo buscado, relación entre el "perfil según test" y las tareas, avance verificado con SIU Guaraní. No uses datos personales para decidir.
Respondé solo un JSON array, sin texto adicional: [{"codigo":"P1","puntaje":0-100,"motivo":"una oración en español rioplatense, positiva y concreta"}]`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
  });
  if (!r.ok) return NextResponse.json({ error: "ia_error" }, { status: 502 });
  const j = await r.json();
  const text: string = (j.content || []).map((b: { text?: string }) => b.text || "").join("");
  const m = text.match(/\[[\s\S]*\]/);
  try {
    const arr = JSON.parse(m ? m[0] : text) as { codigo: string; puntaje: number; motivo: string }[];
    const validos = new Set(candidatos.map((x) => x.codigo));
    const items = arr.filter((x) => validos.has(x.codigo)).slice(0, 5).map((x) => ({ codigo: x.codigo, puntaje: Math.max(0, Math.min(100, Number(x.puntaje) || 0)), motivo: String(x.motivo || "") }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "ia_formato" }, { status: 502 });
  }
}
