"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const eventId = params.eventId as string;

  const tabs = [
    { label: "Статистика", href: `/event/${eventId}/statistics` },
    { label: "Админка", href: `/event/${eventId}/admin` },
    { label: "Опросник", href: `/event/${eventId}/survey` },
  ];

  return (
    <div className="flex-1 flex flex-col pb-16 sm:pb-0">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border-light">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="text-accent hover:text-accent-hover transition-colors text-sm"
          >
            ← Назад
          </Link>
          <Tabs tabs={tabs} />
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
