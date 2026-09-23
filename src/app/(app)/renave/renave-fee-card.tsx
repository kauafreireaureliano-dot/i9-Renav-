"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface Charge {
  id: string;
  operation: string;
  amount: string;
  vehicle: { plate: string; brand: string; model: string };
}

interface PixData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
}

export function RenaveFeeCard() {
  const router = useRouter();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/renave-charges");
      const data = await res.json();
      if (res.ok) {
        setCharges(data.charges);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGeneratePix() {
    setGenerating(true);
    try {
      const res = await fetch("/api/renave-charges/pix", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível gerar o Pix");
        return;
      }
      setPix(data.pix);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCheckPayment() {
    if (!pix) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/renave-charges/pix/${pix.paymentId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível verificar o pagamento");
        return;
      }
      if (data.paid) {
        toast.success("Pagamento confirmado! Taxas quitadas.");
        setPix(null);
        load();
        router.refresh();
      } else {
        toast.info("Pagamento ainda não confirmado. Tente novamente em instantes.");
      }
    } finally {
      setChecking(false);
    }
  }

  function copyPix() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.qrCode).then(() => toast.success("Código Pix copiado."));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxa RENAVE (Serpro) — saldo acumulado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                <p className="text-xs text-muted-foreground">
                  {charges.length} operação(ões) real(is) pendente(s) de pagamento
                </p>
              </div>
              {total > 0 && !pix && (
                <Button onClick={handleGeneratePix} disabled={generating}>
                  {generating ? "Gerando..." : "Gerar Pix"}
                </Button>
              )}
            </div>

            {charges.length > 0 && (
              <div className="space-y-1 text-sm border-t pt-3">
                {charges.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-muted-foreground">
                    <span>
                      {c.operation === "solicitarEntradaEstoque" ? "Entrada" : "Saída"} —{" "}
                      {c.vehicle.brand} {c.vehicle.model} ({c.vehicle.plate})
                    </span>
                    <span>{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {pix && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-center text-sm font-medium">{formatCurrency(pix.amount)}</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyPix}>
                    Copiar código Pix
                  </Button>
                  <Button className="flex-1" onClick={handleCheckPayment} disabled={checking}>
                    {checking ? "Verificando..." : "Verificar pagamento"}
                  </Button>
                </div>
              </div>
            )}

            {total === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma taxa pendente no momento.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
