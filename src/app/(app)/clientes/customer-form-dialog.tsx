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

const ROLES = [
  { value: "COMPRADOR", label: "Comprador" },
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "FORNECEDOR", label: "Fornecedor" },
];

export interface CustomerFormData {
  id: string;
  name: string;
  document: string;
  documentType: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  roles: string[];
}

interface Props {
  customer?: CustomerFormData;
}

export function CustomerFormDialog({ customer }: Props) {
  const router = useRouter();
  const isEdit = !!customer;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<string[]>(customer?.roles ?? ["COMPRADOR"]);
  const [documentType, setDocumentType] = useState(customer?.documentType ?? "CPF");

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name"),
      document: formData.get("document"),
      documentType,
      phone: formData.get("phone") || undefined,
      whatsapp: formData.get("whatsapp") || undefined,
      email: formData.get("email") || undefined,
      address: formData.get("address") || undefined,
      addressNumber: formData.get("addressNumber") || undefined,
      neighborhood: formData.get("neighborhood") || undefined,
      zipCode: formData.get("zipCode") || undefined,
      city: formData.get("city") || undefined,
      state: formData.get("state") || undefined,
      roles,
    };

    try {
      const res = await fetch(
        isEdit ? `/api/customers/${customer.id}` : "/api/customers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível salvar o cliente");
        return;
      }

      toast.success(isEdit ? "Cliente atualizado." : "Cliente cadastrado com sucesso.");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"}>
          {isEdit ? "Editar" : "Novo cliente"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Cadastrar cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome / Razão social</Label>
            <Input id="name" name="name" required defaultValue={customer?.name} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">Documento</Label>
              <Input id="document" name="document" required defaultValue={customer?.document} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={customer?.whatsapp ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Endereço (rua/av.)</Label>
              <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressNumber">Número</Label>
              <Input id="addressNumber" name="addressNumber" defaultValue={customer?.addressNumber ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" name="neighborhood" defaultValue={customer?.neighborhood ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input id="zipCode" name="zipCode" defaultValue={customer?.zipCode ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" name="city" defaultValue={customer?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">UF</Label>
              <Input id="state" name="state" maxLength={2} defaultValue={customer?.state ?? ""} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Endereço completo (com bairro e CEP) é obrigatório para NF-e e RENAVE reais.
          </p>
          <div className="space-y-2">
            <Label>Papéis</Label>
            <div className="flex gap-3">
              {ROLES.map((r) => (
                <label key={r.value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={roles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || roles.length === 0}>
              {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
