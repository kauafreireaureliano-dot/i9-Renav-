import { z } from "zod";

export const createPurchaseSchema = z.object({
  vehicleId: z.string().uuid(),
  sellerId: z.string().uuid(),
  value: z.coerce.number().min(0),
  purchaseDate: z.coerce.date(),
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
