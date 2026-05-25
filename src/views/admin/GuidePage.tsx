import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search } from "lucide-react";
import { GUIDE_SECTIONS } from "@/views/admin/guideContent.ts";

export default function GuidePage() {
  const [q, setQ] = useState("");
  const filter = q.trim().toLowerCase();
  const filtered = GUIDE_SECTIONS.map((s) => ({
    ...s,
    items: filter
      ? s.items.filter((i) => (i.q + " " + i.a).toLowerCase().includes(filter))
      : s.items,
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Central de Ajuda
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Guia passo a passo do Kebab Turco.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no guia…" className="pl-9" />
      </div>

      {filtered.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Nenhum resultado para "{q}"</CardContent></Card>
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
                    {it.a}
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
