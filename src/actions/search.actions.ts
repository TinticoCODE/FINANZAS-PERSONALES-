"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapTransaction } from "@/lib/mappers";
import { getDefaultUserId } from "@/lib/user";

import type { TransactionType } from "@/types";

export type TransactionSearchResult = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  categoryColor: string;
  date: string;
  fundSource: string;
};

function parseAmountQuery(query: string): number | null {
  const normalized = query.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!normalized || !/\d/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export async function searchTransactions(
  query: string
): Promise<TransactionSearchResult[]> {
  const userId = await getDefaultUserId();
  const q = query.trim();

  if (q.length < 2) return [];

  const amountQuery = parseAmountQuery(q);

  const orConditions: Prisma.TransactionWhereInput[] = [
    { description: { contains: q, mode: "insensitive" } },
    { category: { name: { contains: q, mode: "insensitive" } } },
  ];

  if (amountQuery !== null) {
    orConditions.push({ amount: { equals: amountQuery } });
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      OR: orConditions,
    },
    include: { category: true, account: true, creditCard: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  return transactions.map((tx) => {
    const mapped = mapTransaction(tx);
    return {
      id: mapped.id,
      description: mapped.description,
      amount: mapped.amount,
      type: mapped.type,
      category: mapped.category,
      categoryColor: mapped.categoryColor,
      date: mapped.date,
      fundSource: mapped.fundSource,
    };
  });
}
