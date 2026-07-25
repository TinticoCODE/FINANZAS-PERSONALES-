"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCardItem } from "@/features/cards/credit-card-item";
import type { AccountData, CreditCardData } from "@/types";

type CreditCardListProps = {
  cards: CreditCardData[];
  accounts: AccountData[];
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

export function CreditCardList({
  cards,
  accounts,
  onDelete,
  deleting,
}: CreditCardListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -4 }}
        >
          <CreditCardItem
            card={card}
            accounts={accounts}
            onDelete={onDelete}
            deleting={deleting}
          />
        </motion.div>
      ))}
    </div>
  );
}
