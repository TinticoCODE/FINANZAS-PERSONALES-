import { prisma } from "@/lib/prisma";
import { defaultCategoryColors } from "@/lib/labels";
import { getSession } from "@/lib/session";
import { DEFAULT_TIMEZONE } from "@/domain/billing/timezone";

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
  const session = await getSession();
  const email =
    session?.email ?? process.env.ADMIN_EMAIL ?? "admin@sharkmoney.app";
  const name = session?.name ?? "Admin";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, timezone: DEFAULT_TIMEZONE },
  });

  await seedDefaultCategories(user.id);
  return user.id;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { email: session.email },
  });
}

export async function getDefaultUser() {
  const userId = await getDefaultUserId();
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

export async function getUserTimezone(): Promise<string> {
  const user = await getDefaultUser();
  return user.timezone || DEFAULT_TIMEZONE;
}
