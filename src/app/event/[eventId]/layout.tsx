"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { useLang, t } from "@/lib/i18n";

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const eventId = params.eventId as string;
  const { lang } = useLang();

  const tabs = [
    { label: t("tab.statistics", lang), href: `/event/${eventId}/statistics` },
    { label: t("tab.admin", lang), href: `/event/${eventId}/admin` },
    { label: t("tab.survey", lang), href: `/event/${eventId}/survey` },
  ];

  return (
    <div className="flex-1 flex flex-col pb-16 sm:pb-0">
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border-light">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="text-accent hover:text-accent-hover transition-colors text-sm"
          >
            {t("common.back", lang)}
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
