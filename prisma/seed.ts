import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS, PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

// Dados fictícios de desenvolvimento — nunca usar em produção.
async function main() {
  console.log("Seed: permissões...");
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }

  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of codes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { role_permissionId: { role: role as never, permissionId: permission.id } },
        update: {},
        create: { role: role as never, permissionId: permission.id },
      });
    }
  }

  console.log("Seed: usuários...");
  const passwordHash = await bcrypt.hash("i9auto@2026", 12);

  const users = await Promise.all(
    [
      { name: "Administrador", email: "admin@i9car.com.br", role: "ADMIN" as const, cpf: "000.000.000-00" },
      { name: "Gerente Geral", email: "gerente@i9car.com.br", role: "GERENTE" as const },
      { name: "Vendedor Teste", email: "vendedor@i9car.com.br", role: "VENDEDOR" as const },
      { name: "Financeiro Teste", email: "financeiro@i9car.com.br", role: "FINANCEIRO" as const },
      { name: "Documentação Teste", email: "documentacao@i9car.com.br", role: "DOCUMENTACAO" as const },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: "cpf" in u ? { cpf: u.cpf } : {},
        create: { ...u, passwordHash },
      })
    )
  );
  const admin = users[0];

  console.log("Seed: dados da empresa...");
  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        legalName: "I9 Car Multimarcas Ltda",
        tradeName: "I9 Car Multimarcas",
        cnpj: "00.000.000/0001-00",
        city: "",
        state: "",
        renaveEnvironment: "MOCK",
        fiscalEnvironment: "MOCK",
      },
    });
  }

  console.log("Seed: clientes...");
  const seller = await prisma.customer.upsert({
    where: { document: "111.111.111-11" },
    update: {},
    create: {
      name: "Carlos Vendedor Original",
      document: "111.111.111-11",
      documentType: "CPF",
      phone: "(11) 90000-0001",
      roles: ["VENDEDOR"],
      city: "São Paulo",
      state: "SP",
    },
  });

  const buyer = await prisma.customer.upsert({
    where: { document: "222.222.222-22" },
    update: {},
    create: {
      name: "Maria Compradora",
      document: "222.222.222-22",
      documentType: "CPF",
      phone: "(11) 90000-0002",
      roles: ["COMPRADOR"],
      city: "São Paulo",
      state: "SP",
    },
  });

  await prisma.customer.upsert({
    where: { document: "12.345.678/0001-99" },
    update: {},
    create: {
      name: "Auto Peças Fornecedor Ltda",
      document: "12.345.678/0001-99",
      documentType: "CNPJ",
      phone: "(11) 3000-0000",
      roles: ["FORNECEDOR"],
      city: "São Paulo",
      state: "SP",
    },
  });

  console.log("Seed: veículos de teste...");
  const vehiclesData = [
    {
      plate: "ABC1D23",
      renavam: "12345678901",
      chassis: "9BWZZZ377VT004251",
      brand: "Ford",
      model: "Fusion",
      version: "Titanium",
      yearManufacture: 2017,
      yearModel: 2017,
      color: "Preto",
      fuel: "Gasolina",
      transmission: "Automático",
      mileage: 87000,
      purchaseValue: 78000,
      announcedPrice: 99900,
      minimumSalePrice: 92000,
      status: "EM_ESTOQUE" as const,
    },
    {
      plate: "DEF4G56",
      renavam: "98765432109",
      chassis: "9BWZZZ377VT004252",
      brand: "Jeep",
      model: "Compass",
      version: "S",
      yearManufacture: 2020,
      yearModel: 2020,
      color: "Branco",
      fuel: "Flex",
      transmission: "Automático",
      mileage: 45000,
      purchaseValue: 82000,
      announcedPrice: 99900,
      minimumSalePrice: 94000,
      status: "EM_ESTOQUE" as const,
    },
    {
      plate: "HIJ7K89",
      renavam: "45678912340",
      chassis: "9BWZZZ377VT004253",
      brand: "Hyundai",
      model: "HB20",
      version: "Comfort",
      yearManufacture: 2017,
      yearModel: 2017,
      color: "Prata",
      fuel: "Flex",
      transmission: "Manual",
      mileage: 75000,
      purchaseValue: 38000,
      announcedPrice: 49900,
      minimumSalePrice: 45000,
      status: "AGUARDANDO_DOCUMENTACAO" as const,
    },
  ];

  for (const data of vehiclesData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { plate: data.plate },
      update: {},
      create: data,
    });

    await prisma.renaveOperation.upsert({
      where: { vehicleId: vehicle.id },
      update: {},
      create: { vehicleId: vehicle.id, status: "APTO" },
    });

    await prisma.vehicleEvent.create({
      data: {
        vehicleId: vehicle.id,
        type: "STATUS_CHANGE",
        message: "Veículo cadastrado via seed de desenvolvimento.",
      },
    });
  }

  const fusion = await prisma.vehicle.findUniqueOrThrow({ where: { plate: "ABC1D23" } });
  await prisma.purchase.upsert({
    where: { vehicleId: fusion.id },
    update: {},
    create: {
      vehicleId: fusion.id,
      sellerId: seller.id,
      value: fusion.purchaseValue,
      purchaseDate: new Date(),
      status: "CONCLUIDA",
      createdById: admin.id,
    },
  });

  console.log("Seed concluído.");
  console.log("Login de teste: admin@i9car.com.br / i9auto@2026");
  void buyer;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
