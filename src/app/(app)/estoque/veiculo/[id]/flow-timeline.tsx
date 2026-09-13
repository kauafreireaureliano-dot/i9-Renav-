"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { FlowStep } from "@/lib/vehicle-flow";

interface Props {
  vehicleId: string;
  flowType: "compra" | "venda";
  steps: FlowStep[];
  counterpartName?: string; // vendedor (compra) ou comprador (venda)
  saleValue?: number;
}

const RENAVE_ACTIONS = new Set([
  "consultarAptidao",
  "solicitarEntradaEstoque",
  "enviarAtpvAssinatura",
  "solicitarSaidaEstoque",
]);

function StepIcon({ status }: { status: FlowStep["status"] }) {
  if (status === "done") return <span className="text-emerald-600">✓</span>;
  if (status === "warning") return <span className="text-red-600">⚠</span>;
  if (status === "available") return <span className="text-primary">○</span>;
  return <span className="text-muted-foreground">○</span>;
}

export function FlowTimeline({ vehicleId, flowType, steps, counterpartName, saleValue }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<{ action: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ action: string } | null>(null);

  async function runRenaveAction(action: string) {
    setPendingAction(action);
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
      } else if (action === "consultarAptidao" && result.data?.apto === false) {
        toast.warning(`✕ Não apto: ${result.data.motivo ?? "sem detalhes"}`);
      } else {
        toast.success("Operação concluída no ambiente de teste (MOCK).");
      }
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  async function runFinalStep(action: string, endpoint: string) {
    setPendingAction(action);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível concluir esta etapa");
        return;
      }

      toast.success("Etapa concluída.");
      setConfirmDialog(null);
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  function handleStepClick(step: FlowStep) {
    if (step.status !== "available") return;

    if (RENAVE_ACTIONS.has(step.action)) {
      runRenaveAction(step.action);
      return;
    }

    if (step.action === "emitirNotaEntrada" || step.action === "emitirNotaSaida") {
      setInvoiceDialog({ action: step.action });
      return;
    }

    if (step.action === "confirmarEstoque" || step.action === "finalizarVenda") {
      setConfirmDialog({ action: step.action });
      return;
    }
  }

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-start gap-3 py-2">
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} />
            {i < steps.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div>
              <p
                className={cn(
                  "text-sm",
                  step.status === "done" && "text-muted-foreground line-through",
                  step.status === "blocked" && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.detail && <p className="text-xs text-red-600">{step.detail}</p>}
            </div>
            {step.status === "available" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pendingAction === step.action}
                onClick={() => handleStepClick(step)}
              >
                {pendingAction === step.action ? "Executando..." : "Executar"}
              </Button>
            )}
          </div>
        </div>
      ))}

      {invoiceDialog && (
        <InvoiceStepDialog
          vehicleId={vehicleId}
          type={invoiceDialog.action === "emitirNotaEntrada" ? "ENTRADA" : "SAIDA"}
          defaultRecipient={counterpartName}
          onClose={() => setInvoiceDialog(null)}
          onDone={() => {
            setInvoiceDialog(null);
            router.refresh();
          }}
        />
      )}

      {confirmDialog?.action === "confirmarEstoque" && (
        <Dialog open onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar documentação de entrada</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              O veículo passará para <strong>estoque ativo</strong> e ficará disponível para venda.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => runFinalStep("confirmarEstoque", `/api/vehicles/${vehicleId}/confirm-stock`)}
                disabled={pendingAction === "confirmarEstoque"}
              >
                {pendingAction === "confirmarEstoque" ? "Confirmando..." : "Confirmar estoque"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {confirmDialog?.action === "finalizarVenda" && (
        <Dialog open onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalizar venda</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Você está prestes a confirmar a saída definitiva deste veículo do estoque.
            </p>
            <div className="rounded-md border p-3 text-sm space-y-1">
              {counterpartName && (
                <p>
                  <span className="text-muted-foreground">Comprador: </span>
                  {counterpartName}
                </p>
              )}
              {saleValue !== undefined && (
                <p>
                  <span className="text-muted-foreground">Valor: </span>
                  {formatCurrency(saleValue)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog(null)}>
                Voltar
              </Button>
              <Button
                onClick={() => runFinalStep("finalizarVenda", `/api/vehicles/${vehicleId}/finalize-sale`)}
                disabled={pendingAction === "finalizarVenda"}
              >
                {pendingAction === "finalizarVenda" ? "Finalizando..." : "Confirmar saída"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        Fluxo de {flowType === "compra" ? "compra (entrada)" : "venda (saída)"} · ambiente de teste
      </p>
    </div>
  );
}

function InvoiceStepDialog({
  vehicleId,
  type,
  defaultRecipient,
  onClose,
  onDone,
}: {
  vehicleId: string;
  type: "ENTRADA" | "SAIDA";
  defaultRecipient?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          type,
          issuer: formData.get("issuer"),
          recipient: formData.get("recipient"),
          value: formData.get("value"),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Falha ao emitir a nota (ambiente de teste)");
        return;
      }

      toast.success("Nota emitida no ambiente de teste (MOCK).");
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "ENTRADA" ? "Registrar NF de entrada" : "Emitir NF de saída"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issuer">Emitente</Label>
            <Input
              id="issuer"
              name="issuer"
              required
              defaultValue={type === "ENTRADA" ? defaultRecipient : "I9 Car Multimarcas"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatário</Label>
            <Input
              id="recipient"
              name="recipient"
              required
              defaultValue={type === "SAIDA" ? defaultRecipient : "I9 Car Multimarcas"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$)</Label>
            <Input id="value" name="value" type="number" step="0.01" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Emitindo..." : "Emitir (ambiente de teste)"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
