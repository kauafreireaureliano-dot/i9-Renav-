"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleEditData {
  id: string;
  plate: string;
  renavam: string;
  chassis: string;
  brand: string;
  model: string;
  version: string | null;
  yearManufacture: number;
  yearModel: number;
  color: string;
  fuel: string;
  transmission: string;
  mileage: number;
  category: string | null;
  bodyType: string | null;
  crvType: string | null;
  numeroCrv: string | null;
  codigoSegurancaCrv: string | null;
  purchaseValue: string;
  announcedPrice: string;
  minimumSalePrice: string;
  origin: string | null;
  notes: string | null;
}

const FIELDS: Array<{ name: keyof VehicleEditData; label: string; type?: string }> = [
  { name: "plate", label: "Placa" },
  { name: "renavam", label: "RENAVAM" },
  { name: "chassis", label: "Chassi" },
  { name: "brand", label: "Marca" },
  { name: "model", label: "Modelo" },
  { name: "version", label: "Versão" },
  { name: "yearManufacture", label: "Ano de fabricação", type: "number" },
  { name: "yearModel", label: "Ano do modelo", type: "number" },
  { name: "color", label: "Cor" },
  { name: "fuel", label: "Combustível" },
  { name: "transmission", label: "Câmbio" },
  { name: "mileage", label: "Quilometragem", type: "number" },
  { name: "category", label: "Categoria" },
  { name: "bodyType", label: "Carroceria" },
  { name: "numeroCrv", label: "Número do CRV" },
  { name: "codigoSegurancaCrv", label: "Código de segurança do CRV" },
  { name: "purchaseValue", label: "Valor de compra (R$)", type: "number" },
  { name: "announcedPrice", label: "Preço anunciado (R$)", type: "number" },
  { name: "minimumSalePrice", label: "Preço mínimo de venda (R$)", type: "number" },
  { name: "origin", label: "Origem" },
];

export function VehicleEditDialog({ vehicle }: { vehicle: VehicleEditData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [crvType, setCrvType] = useState<string>(vehicle.crvType ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (value !== "") payload[key] = value;
    });
    if (crvType) payload.crvType = crvType;

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar as alterações");
        return;
      }

      toast.success("Veículo atualizado.");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Editar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar veículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type ?? "text"}
                  step={field.type === "number" ? "0.01" : undefined}
                  defaultValue={vehicle[field.name] ?? ""}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="crvType">Tipo do CRV</Label>
              <Select value={crvType} onValueChange={setCrvType}>
                <SelectTrigger id="crvType">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AZUL">Azul</SelectItem>
                  <SelectItem value="VERDE">Verde</SelectItem>
                  <SelectItem value="BRANCO">Branco</SelectItem>
                  <SelectItem value="DIGITAL">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={vehicle.notes ?? ""} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
