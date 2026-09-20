import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

// Handler único para todo catch de rota de API. Antes, qualquer erro que não
// fosse AuthError era relançado (throw err) e virava um 500 em HTML — o
// front quebrava ao tentar ler o JSON da resposta e a tela ficava muda, sem
// nenhuma mensagem. Confirmado ao vivo mais de uma vez (CPF do operador
// faltando, certificado do RENAVE). Toda rota deve usar isto no catch.
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Erro na API:", err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Erro inesperado" },
    { status: 500 }
  );
}
