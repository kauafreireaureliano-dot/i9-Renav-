"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  vehicleId: string;
  status: string;
  aptitudeResult?: string | null;
}

const STEPS: Array<{ action: string; label: string }> = [
  { action: "consultarAptidao", label: "Consultar aptidão" },
  { action: "solicitarEntradaEstoque", label: "Solicitar entrada em estoque" },
  { action: "enviarAtpvAssinatura", label: "Registrar ATPV" },
  { action: "consultarAtpv", label: "Consultar ATPV" },
];

export function RenaveActions({ vehicleId, status, aptitudeResult }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [runningAction, setRunningAction] = useState<string | null>(null);

  function runAction(action: string) {
    setRunningAction(action);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/renave/${vehicleId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Falha na operação RENAVE");
          return;
        }

        const result = data.result;
        if (!result.success) {
          toast.error(
            `⚠ Pendência (${result.errorCode ?? "erro"}): ${result.errorMessage ?? "operação não concluída"}`
          );
        } else if (action === "consultarAptidao") {
          toast[result.data.apto ? "success" : "warning"](
            result.data.apto
              ? "✓ Veículo apto para entrada"
              : `✕ Não apto: ${result.data.motivo ?? "sem detalhes"}`
          );
        } else {
          toast.success("Operação concluída no ambiente de teste (MOCK).");
        }

        router.refresh();
      } finally {
        setRunningAction(null);
      }
    });
  }

  const notApto = status === "NAO_APTO";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Status atual:</span>
        <Badge variant={status === "ERRO" || notApto ? "destructive" : "secondary"}>{status}</Badge>
        <Badge variant="outline" className="ml-2">
          AMBIENTE DE TESTE
        </Badge>
      </div>

      {notApto && aptitudeResult && (
        <p className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">
          ✕ Não apto para entrada: {aptitudeResult}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {STEPS.map((step) => (
          <Button
            key={step.action}
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => runAction(step.action)}
          >
            {runningAction === step.action ? "Executando..." : step.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
