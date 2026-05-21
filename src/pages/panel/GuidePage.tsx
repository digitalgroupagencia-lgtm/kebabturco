import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search } from "lucide-react";

interface FaqItem { q: string; a: string; }
interface FaqSection { title: string; items: FaqItem[]; }

const SECTIONS: FaqSection[] = [
  {
    title: "Primeiros passos",
    items: [
      { q: "Como acesso meu painel?", a: "Entre em **/auth** com seu e-mail e senha. Você será redirecionado para **/panel** automaticamente." },
      { q: "Como cadastro um membro da equipe?", a: "Vá em **Equipe** no menu lateral → **Novo Membro**. Informe nome, e-mail, senha temporária, papel e o **idioma** que ele verá o sistema." },
      { q: "Quais papéis existem?", a: "**Admin Restaurante** (acesso total ao painel), **Operador** (caixa e pedidos), **Cozinha** (somente cozinha), **Vendedor** (app mobile em /seller)." },
    ],
  },
  {
    title: "Cardápio e Produtos",
    items: [
      { q: "Onde cadastro produtos?", a: "Em **Cardápio**. Crie categorias e depois produtos dentro de cada categoria com nome, descrição, preço, imagem, tamanhos e adicionais." },
      { q: "Como destaco um produto?", a: "Marque como **bestseller** ou **promo** na edição do produto. Eles aparecem em destaque no totem." },
    ],
  },
  {
    title: "Identidade Visual e Banners",
    items: [
      { q: "Onde mudo cores e logos?", a: "Em **Identidade**. Define cores primária/CTA/header/fundo, fonte, logos e ícones de modo." },
      { q: "Como adicionar banners promocionais?", a: "Em **Banners**. Suporta imagens (até 5) e vídeos (YouTube ou .mp4), com ordenação e ativar/desativar." },
    ],
  },
  {
    title: "Totem e Telas",
    items: [
      { q: "Como configurar as telas do totem?", a: "Em **Telas do totem** você controla quais etapas aparecem (idioma, modo, banners, finalização)." },
      { q: "Como obter o link público do totem?", a: "O totem abre na rota raiz do domínio. Cole esse link no equipamento físico." },
    ],
  },
  {
    title: "Pagamentos e Impressora",
    items: [
      { q: "Como configurar métodos de pagamento?", a: "Em **Pagamentos**. Ative cartão, dinheiro, Pix, Apple Pay, Google Pay, link e balcão." },
      { q: "Como conectar uma impressora térmica?", a: "Em **Impressoras**. Informe IP e porta (padrão 9100) e o endpoint do agente local. Use **Testar impressão** para validar." },
    ],
  },
  {
    title: "Vendedor / Garçom (mobile)",
    items: [
      { q: "Como criar um vendedor?", a: "Em **Vendedores** → **Novo vendedor**. Informe nome, e-mail e senha. Ele entra em **/auth** e é redirecionado para **/seller** (app mobile)." },
      { q: "Como o vendedor cria um pedido?", a: "Toca em **Novo pedido**, digita mesa e cliente, escolhe produtos com +/-, abre o resumo e envia para cozinha." },
      { q: "Como fechar mesa?", a: "Detalhe da mesa → **Fechar mesa**. Pode pagar tudo junto ou dividir por cliente." },
    ],
  },
];

export default function GuidePage() {
  const [q, setQ] = useState("");
  const filter = q.trim().toLowerCase();
  const filtered = SECTIONS.map((s) => ({
    ...s,
    items: filter ? s.items.filter((i) => (i.q + " " + i.a).toLowerCase().includes(filter)) : s.items,
  })).filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Central de Ajuda
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Guia passo a passo de tudo que existe no painel.</p>
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
