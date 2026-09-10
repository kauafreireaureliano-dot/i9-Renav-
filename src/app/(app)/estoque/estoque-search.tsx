"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export function EstoqueSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Input
      placeholder="Buscar por placa, RENAVAM, chassi ou modelo..."
      defaultValue={defaultValue}
      className="max-w-sm"
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams();
        if (value) params.set("search", value);
        router.replace(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
