import { prisma } from "@/lib/prisma";
import { defaultCategoryColors } from "@/lib/labels";

const DEFAULT_EMAIL = "default@finflow.local";

const defaultCategories = [
  { name: "Salario", type: "INCOME" as const },
  { name: "Freelance", type: "INCOME" as const },
  { name: "Bonificaciones", type: "INCOME" as const },
  { name: "Inversiones", type: "INCOME" as const },
  { name: "Alimentación", type: "EXPENSE" as const },
  { name: "Transporte", type: "EXPENSE" as const },
  { name: "Vivienda", type: "EXPENSE" as const },
  { name: "Salud", type: "EXPENSE" as const },
  { name: "Educación", type: "EXPENSE" as const },
  { name: "Entretenimiento", type: "EXPENSE" as const },
  { name: "Compras", type: "EXPENSE" as const },
  { name: "Servicios", type: "EXPENSE" as const },
  { name: "Suscripciones", type: "EXPENSE" as const },
];

async function seedDefaultCategories(userId: string) {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return;

  await prisma.category.createMany({
    data: defaultCategories.map((category, index) => ({
      userId,
      name: category.name,
      type: category.type,
      color: defaultCategoryColors[index % defaultCategoryColors.length],
    })),
    skipDuplicates: true,
  });
}

export async function getDefaultUserId() {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_EMAIL },
    update: {},
    create: {
      email: DEFAULT_EMAIL,
      name: "Usuario",
    },
  });

  await seedDefaultCategories(user.id);
  return user.id;
}
