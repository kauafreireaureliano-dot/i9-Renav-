import { prisma } from "@/lib/prisma";
import type { Prisma, VehicleStatus } from "@prisma/client";

export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus;
  brand?: string;
}

export function listVehicles(filters: VehicleFilters = {}) {
  const where: Prisma.VehicleWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.brand) where.brand = { equals: filters.brand, mode: "insensitive" };

  if (filters.search) {
    where.OR = [
      { plate: { contains: filters.search, mode: "insensitive" } },
      { renavam: { contains: filters.search, mode: "insensitive" } },
      { chassis: { contains: filters.search, mode: "insensitive" } },
      { model: { contains: filters.search, mode: "insensitive" } },
      { brand: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.vehicle.findMany({
    where,
    include: {
      photos: { where: { isCover: true }, take: 1 },
      costs: true,
      renaveOperation: true,
      documents: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      photos: true,
      costs: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      renaveOperation: { include: { events: { orderBy: { createdAt: "desc" } } } },
      purchase: { include: { seller: true } },
      sale: { include: { buyer: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type CreateVehicleInput = Prisma.VehicleCreateInput;

export async function createVehicle(data: CreateVehicleInput) {
  return prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({ data });
    await tx.renaveOperation.create({ data: { vehicleId: vehicle.id } });
    await tx.vehicleEvent.create({
      data: {
        vehicleId: vehicle.id,
        type: "STATUS_CHANGE",
        message: "Veículo cadastrado no sistema.",
      },
    });
    return vehicle;
  });
}

export function updateVehicleStatus(id: string, status: VehicleStatus) {
  return prisma.vehicle.update({ where: { id }, data: { status } });
}

export function updateVehicle(id: string, data: Prisma.VehicleUpdateInput) {
  return prisma.vehicle.update({ where: { id }, data });
}
