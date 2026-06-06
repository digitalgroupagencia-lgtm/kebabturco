import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search, Sparkles } from "lucide-react";
import { RESTAURANT_GUIDE_SECTIONS } from "@/lib/restaurantGuideContent";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { PremiumCard } from "@/components/premium/PremiumCard";
import { PremiumActionButton } from "@/components/premium/PremiumActionButton";
import { PremiumEmptyState } from "@/components/premium/PremiumEmptyState";
import { PremiumMetricCard } from "@/components/premium/PremiumMetricCard";

export default function GuidePage() {
  const [q, setQ] = useState("");
  const filter = q.trim().toLowerCase();
  const filtered = RESTAURANT_GUIDE_SECTIONS.map((s) => ({
    ...s,
    items: filter ? s.items.filter((i) => (i.q + " " + i.a).toLowerCase().includes(filter)) : s.items,
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-5 rounded-3xl border border-white/10 bg-[#050505] p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-5">
      <PremiumPageHeader
        title="Central de conhecimento"
        subtitle="Aprenda operação diária, boas práticas e resolução de problemas"
        actions={
          <PremiumActionButton tone="primary">
            <Sparkles className="mr-2 h-4 w-4" />
            Perguntar IA
          </PremiumActionButton>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <PremiumMetricCard title="Artigos totais" value={RESTAURANT_GUIDE_SECTIONS.reduce((sum, section) => sum + section.items.length, 0)} subtitle="base completa" icon={BookOpen} color="brand" />
        <PremiumMetricCard title="Módulos" value={RESTAURANT_GUIDE_SECTIONS.length} subtitle="secções disponíveis" icon={Search} color="blue" />
        <PremiumMetricCard title="Resultados atuais" value={filtered.reduce((sum, section) => sum + section.items.length, 0)} subtitle="após pesquisa" icon={Sparkles} color="purple" />
      </section>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no guia…" className="pl-9 bg-[#111111] border-white/10" />
      </div>

      {filtered.length === 0 && (
        <PremiumEmptyState
          icon={Search}
          title="Nenhum resultado encontrado"
          description={`Não encontramos conteúdos para "${q}". Tente outras palavras.`}
        />
      )}

      {filtered.map((s) => (
        <PremiumCard key={s.title} title={s.title} className="bg-[#111111]">
          <div className="p-0 sm:p-1">
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
          </div>
        </PremiumCard>
      ))}
    </div>
  );
}
