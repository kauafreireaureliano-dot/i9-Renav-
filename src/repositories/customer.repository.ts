import { prisma } from "@/lib/prisma";
import type { CustomerRole, Prisma } from "@prisma/client";

export function listCustomers(filters: { role?: CustomerRole; search?: string } = {}) {
  const where: Prisma.CustomerWhereInput = {};
  if (filters.role) where.roles = { has: filters.role };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { document: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return prisma.customer.findMany({ where, orderBy: { name: "asc" } });
}

export function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      purchasesAsSeller: { include: { vehicle: true } },
      salesAsBuyer: { include: { vehicle: true } },
    },
  });
}

export type CreateCustomerData = Prisma.CustomerCreateInput;

export function createCustomer(data: CreateCustomerData) {
  return prisma.customer.create({ data });
}

export function updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
  return prisma.customer.update({ where: { id }, data });
}
