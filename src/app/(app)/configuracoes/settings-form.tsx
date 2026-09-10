"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanySettings } from "@prisma/client";

const FIELDS: Array<{ name: keyof CompanySettings; label: string; required?: boolean }> = [
  { name: "legalName", label: "Razão social", required: true },
  { name: "tradeName", label: "Nome fantasia", required: true },
  { name: "cnpj", label: "CNPJ", required: true },
  { name: "stateRegistration", label: "Inscrição estadual" },
  { name: "address", label: "Endereço" },
  { name: "city", label: "Cidade" },
  { name: "state", label: "UF" },
  { name: "phone", label: "Telefone" },
  { name: "email", label: "E-mail" },
  { name: "renaveEmail", label: "E-mail usado nas operações RENAVE" },
];

export function SettingsForm({
  settings,
  readOnly,
}: {
  settings: CompanySettings | null;
  readOnly: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar");
        return;
      }

      toast.success("Configurações salvas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            required={field.required}
            disabled={readOnly}
            defaultValue={settings?.[field.name]?.toString() ?? ""}
          />
        </div>
      ))}
      {!readOnly && (
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}
      {readOnly && (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Somente administradores podem editar os dados da empresa.
        </p>
      )}
    </form>
  );
}
