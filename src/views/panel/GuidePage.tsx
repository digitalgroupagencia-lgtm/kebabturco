import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search } from "lucide-react";
import { RESTAURANT_GUIDE_SECTIONS } from "@/lib/restaurantGuideContent";
import { useStaffT } from "@/hooks/useStaffT";
import { panelT } from "@/lib/staffPanelLocale";

export default function GuidePage() {
  const { t, lang } = useStaffT();
  const [q, setQ] = useState("");
  const filter = q.trim().toLowerCase();
  const filtered = RESTAURANT_GUIDE_SECTIONS.map((s) => ({
    ...s,
    items: filter ? s.items.filter((i) => (i.q + " " + i.a).toLowerCase().includes(filter)) : s.items,
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> {t("guide.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t("guide.subtitle")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("guide.search.ph")} className="pl-9" />
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            {panelT(lang, "guide.no_results", { q })}
          </CardContent>
        </Card>
      )}

      {filtered.map((s) => (
        <Card key={s.title}>
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-base mb-2">{s.title}</h3>
            <Accordion type="multiple">
              {s.items.map((it, i) => (
                <AccordionItem key={i} value={`${s.title}-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{it.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line">
                    {it.a.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
                      part.startsWith("**") && part.endsWith("**")
                        ? <strong key={idx} className="text-foreground">{part.slice(2, -2)}</strong>
                        : <span key={idx}>{part}</span>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
