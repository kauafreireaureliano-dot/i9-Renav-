import { z } from "zod";

export const createSaleSchema = z.object({
  vehicleId: z.string().uuid(),
  buyerId: z.string().uuid(),
  value: z.coerce.number().min(0),
  saleDate: z.coerce.date(),
  paymentMethod: z.string().min(1),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
