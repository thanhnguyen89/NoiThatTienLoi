'use client';

import type { ReactNode } from 'react';

interface LinksPanelCard {
  key: string;
  title: string;
  body: ReactNode;
}

interface LinksPanelProps {
  cards: LinksPanelCard[];
}

export function LinksPanel({ cards }: LinksPanelProps) {
  return (
    <div className="space-y-4 p-4">
      {cards.map((card) => (
        <div key={card.key} className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-sm font-bold text-gray-800">{card.title}</p>
          {card.body}
        </div>
      ))}
    </div>
  );
}
