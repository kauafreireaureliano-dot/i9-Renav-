import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  document: z.string().min(11).max(18),
  documentType: z.enum(["CPF", "CNPJ"]),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  roles: z.array(z.enum(["COMPRADOR", "VENDEDOR", "FORNECEDOR"])).min(1),
  notes: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
