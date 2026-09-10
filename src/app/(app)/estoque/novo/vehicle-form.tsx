"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FIELDS: Array<{ name: string; label: string; type?: string; required?: boolean }> = [
  { name: "plate", label: "Placa", required: true },
  { name: "renavam", label: "RENAVAM", required: true },
  { name: "chassis", label: "Chassi", required: true },
  { name: "brand", label: "Marca", required: true },
  { name: "model", label: "Modelo", required: true },
  { name: "version", label: "Versão" },
  { name: "yearManufacture", label: "Ano de fabricação", type: "number", required: true },
  { name: "yearModel", label: "Ano do modelo", type: "number", required: true },
  { name: "color", label: "Cor", required: true },
  { name: "fuel", label: "Combustível", required: true },
  { name: "transmission", label: "Câmbio", required: true },
  { name: "mileage", label: "Quilometragem", type: "number", required: true },
  { name: "category", label: "Categoria" },
  { name: "bodyType", label: "Carroceria" },
  { name: "purchaseValue", label: "Valor de compra (R$)", type: "number", required: true },
  { name: "announcedPrice", label: "Preço anunciado (R$)", type: "number", required: true },
  { name: "minimumSalePrice", label: "Preço mínimo de venda (R$)", type: "number", required: true },
  { name: "purchaseDate", label: "Data de compra", type: "date" },
  { name: "entryDate", label: "Data de entrada", type: "date" },
  { name: "origin", label: "Origem" },
];

export function VehicleForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (value !== "") payload[key] = value;
    });

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível cadastrar o veículo");
        return;
      }

      toast.success("Veículo cadastrado com sucesso.");
      router.push(`/estoque/veiculo/${data.vehicle.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                step={field.type === "number" ? "0.01" : undefined}
              />
            </div>
          ))}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Cadastrar veículo"}
        </Button>
      </div>
    </form>
  );
}
