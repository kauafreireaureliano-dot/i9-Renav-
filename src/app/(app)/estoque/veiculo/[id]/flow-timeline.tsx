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
  purchaseValue?: number;
}

const RENAVE_ACTIONS = new Set([
  "consultarAptidao",
  "solicitarEntradaEstoque",
  "solicitarSaidaEstoque",
]);

function StepIcon({ status }: { status: FlowStep["status"] }) {
  if (status === "done") return <span aria-label="Concluído">✅</span>;
  if (status === "warning") return <span className="text-red-600">⚠</span>;
  if (status === "available") return <span className="text-primary">○</span>;
  return <span className="text-muted-foreground">○</span>;
}

export function FlowTimeline({
  vehicleId,
  flowType,
  steps,
  counterpartName,
  saleValue,
  purchaseValue,
}: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [invoiceDialog, setInvoiceDialog] = useState<{ action: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ action: string } | null>(null);
  const [atpvDialog, setAtpvDialog] = useState(false);

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
        toast.warning(`✕ Não apto: ${result.data.motivosParaNaoAptidao?.join("; ") ?? "sem detalhes"}`);
      } else {
        toast.success("Operação concluída.");
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
    if (step.status === "blocked") return;

    if (RENAVE_ACTIONS.has(step.action)) {
      runRenaveAction(step.action);
      return;
    }

    if (step.action === "consultarAtpv") {
      setAtpvDialog(true);
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
                  step.status === "blocked" && "text-muted-foreground"
                )}
              >
                {step.label}
                {step.status === "done" && (
                  <span className="ml-2 text-xs font-medium text-emerald-600">Concluído</span>
                )}
              </p>
              {step.detail && (
                <p
                  className={cn(
                    "text-xs",
                    step.status === "warning" ? "text-red-600" : "text-amber-600"
                  )}
                >
                  {step.detail}
                </p>
              )}
            </div>
            {step.status !== "blocked" && (
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

      {atpvDialog && (
        <AtpvStepDialog
          vehicleId={vehicleId}
          onClose={() => setAtpvDialog(false)}
          onDone={() => {
            setAtpvDialog(false);
            router.refresh();
          }}
        />
      )}

      {invoiceDialog && (
        <InvoiceStepDialog
          vehicleId={vehicleId}
          type={invoiceDialog.action === "emitirNotaEntrada" ? "ENTRADA" : "SAIDA"}
          defaultRecipient={counterpartName}
          defaultValue={invoiceDialog.action === "emitirNotaEntrada" ? purchaseValue : saleValue}
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

      {flowType === "venda" && (
        <div className="border-t pt-3 mt-1">
          <p className="text-sm font-medium mb-1">Transferência e vistoria (Detran-PE)</p>
          <p className="text-xs text-muted-foreground mb-2">
            Fora do RENAVE — taxa estadual, paga direto no site do Detran-PE. Sem despachante.
          </p>
          <a
            href="https://www.detran.pe.gov.br/transferencia-de-propriedade-mudanca-de-proprietario"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              Emitir guia no Detran-PE ↗
            </Button>
          </a>
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        Fluxo de {flowType === "compra" ? "compra (entrada)" : "venda (saída)"}
      </p>
    </div>
  );
}

function InvoiceStepDialog({
  vehicleId,
  type,
  defaultRecipient,
  defaultValue,
  onClose,
  onDone,
}: {
  vehicleId: string;
  type: "ENTRADA" | "SAIDA";
  defaultRecipient?: string;
  defaultValue?: number;
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
        toast.error(data.error ?? "Falha ao emitir a nota");
        return;
      }

      const environment = data.invoice?.environment;
      toast.success(
        environment === "PRODUCAO"
          ? "Nota emitida — verifique o ambiente da Notaas (homologação ou produção real)."
          : "Nota emitida no ambiente de simulação interna (MOCK)."
      );
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
            <Input
              id="value"
              name="value"
              type="number"
              step="0.01"
              required
              defaultValue={defaultValue !== undefined ? defaultValue.toFixed(2) : undefined}
            />
            {defaultValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                Preenchido com o valor de {type === "ENTRADA" ? "compra" : "venda"} cadastrado — confira antes de emitir.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Emitindo..." : "Emitir nota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AtpvStepDialog({
  vehicleId,
  onClose,
  onDone,
}: {
  vehicleId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await fetch(`/api/renave/${vehicleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consultarAtpv" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao consultar o ATPV");
        return;
      }
      const result = data.result;
      if (!result.success) {
        toast.error(result.errorMessage ?? "Não foi possível consultar");
      } else if (result.data?.dataHoraRegistroAssinaturaVendedor) {
        toast.success("O vendedor já assinou o ATPV-e.");
      } else {
        toast.warning("Ainda não há assinatura registrada para este veículo.");
      }
      onDone();
    } finally {
      setChecking(false);
    }
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleSend() {
    if (!file) return;
    setSending(true);
    try {
      const fotoAssinadaBase64 = await fileToBase64(file);
      const res = await fetch(`/api/renave/${vehicleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enviarAssinaturaAtpv", fotoAssinadaBase64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao enviar a assinatura");
        return;
      }
      const result = data.result;
      if (!result.success) {
        toast.error(result.errorMessage ?? "RENAVE recusou a assinatura enviada");
        return;
      }
      toast.success("Assinatura enviada com sucesso.");
      onDone();
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assinatura do ATPV-e</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Verifica se o vendedor já assinou (sem enviar nada).
            </p>
            <Button variant="outline" onClick={handleCheck} disabled={checking} className="w-full">
              {checking ? "Consultando..." : "Consultar status atual"}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="atpv-foto">
              Enviar foto do ATPV-e assinado de próprio punho pelo vendedor
            </Label>
            <Input
              id="atpv-foto"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Peça pro vendedor assinar a folha impressa (ou na tela do celular), fotografe e envie aqui.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSend} disabled={!file || sending}>
            {sending ? "Enviando..." : "Enviar assinatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
