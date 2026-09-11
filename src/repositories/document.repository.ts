import { prisma } from "@/lib/prisma";
import type { DocumentType } from "@prisma/client";

export function listDocumentsByVehicle(vehicleId: string) {
  return prisma.document.findMany({
    where: { vehicleId },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listAllDocuments() {
  return prisma.document.findMany({
    include: { uploadedBy: true, vehicle: true, ownerCustomer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function getDocumentById(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export function createDocument(data: {
  vehicleId?: string;
  ownerCustomerId?: string;
  type: DocumentType;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  notes?: string;
  uploadedById: string;
}) {
  return prisma.document.create({ data });
}

export function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}
