"use client";

import { useEffect, useState } from "react";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Vehicle, Customer } from "@prisma/client";
import { formatCurrency } from "@/lib/format";

const PAYMENT_METHODS = ["À vista", "Financiamento", "Consórcio", "Troca + dinheiro", "PIX"];

export function SaleFormDialog({ vehicles }: { vehicles: Vehicle[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [loading, setLoading] = useState(false);
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/customers?papel=COMPRADOR")
      .then((res) => res.json())
      .then((data) => setBuyers(data.customers ?? []));
  }, [open]);

  function handleReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicleId || !buyerId) {
      toast.error("Selecione o veículo e o comprador.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    setPendingPayload({
      vehicleId,
      buyerId,
      value: formData.get("value"),
      saleDate: formData.get("saleDate"),
      paymentMethod,
    });
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!pendingPayload) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingPayload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível registrar a venda");
        return;
      }

      toast.success("Venda registrada. Veículo reservado.");
      setOpen(false);
      setStep("form");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const buyer = buyers.find((b) => b.id === buyerId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setStep("form");
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={vehicles.length === 0}>Registrar venda</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "form" ? "Registrar venda" : "Confirmar venda"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleReview} className="space-y-4">
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.brand} {v.model} — {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comprador</Label>
              <Select value={buyerId} onValueChange={setBuyerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o comprador cadastrado" />
                </SelectTrigger>
                <SelectContent>
                  {buyers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} — {b.document}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {buyers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum comprador cadastrado. Cadastre em Clientes com o papel &quot;Comprador&quot;.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$)</Label>
                <Input id="value" name="value" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleDate">Data</Label>
                <Input id="saleDate" name="saleDate" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Revisar</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a registrar a saída deste veículo do estoque.
            </p>
            <div className="rounded-md border p-4 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Veículo: </span>
                {vehicle?.brand} {vehicle?.model} — {vehicle?.plate}
              </p>
              <p>
                <span className="text-muted-foreground">Comprador: </span>
                {buyer?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Valor: </span>
                {formatCurrency(Number(pendingPayload?.value ?? 0))}
              </p>
              <p>
                <span className="text-muted-foreground">Data: </span>
                {String(pendingPayload?.saleDate)}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("form")}>
                Voltar
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading ? "Confirmando..." : "Confirmar saída"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
