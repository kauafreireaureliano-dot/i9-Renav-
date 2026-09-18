import { z } from "zod";

export const createVehicleSchema = z.object({
  plate: z.string().min(7).max(8),
  renavam: z.string().min(9).max(11),
  chassis: z.string().min(11).max(17),
  brand: z.string().min(1),
  model: z.string().min(1),
  version: z.string().optional(),
  yearManufacture: z.coerce.number().int().min(1950).max(2100),
  yearModel: z.coerce.number().int().min(1950).max(2100),
  color: z.string().min(1),
  fuel: z.string().min(1),
  transmission: z.string().min(1),
  mileage: z.coerce.number().int().min(0),
  category: z.string().optional(),
  bodyType: z.string().optional(),
  crvType: z.enum(["AZUL", "VERDE", "BRANCO", "DIGITAL"]).optional(),
  numeroCrv: z.string().optional(),
  codigoSegurancaCrv: z.string().optional(),
  purchaseValue: z.coerce.number().min(0).optional(),
  announcedPrice: z.coerce.number().min(0),
  minimumSalePrice: z.coerce.number().min(0).optional(),
  purchaseDate: z.coerce.date().optional(),
  entryDate: z.coerce.date().optional(),
  origin: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
