import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}
interface FaqSection {
  title: string;
  items: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    title: "Como acessar cada painel (passo a passo)",
    items: [
      { q: "Como eu (Admin Master) acesso meu painel global?", a: "Faça login em **/auth** com seu e-mail e senha. Como você tem o papel **admin_master**, será redirecionado para **/admin** automaticamente. Daí você vê: Dashboard, Clientes, Usuários, Conversas IA, Central de Ajuda, Monitoramento, Configurações globais, etc." },
      { q: "Como entro no painel de um cliente específico (sem misturar dados)?", a: "1. Em **/admin/tenants** localize o card do cliente.\n2. Clique no botão **Acessar projeto**.\n3. Você entra em **/admin/tenants/:slug** — um painel completo escopado SOMENTE naquele cliente (cardápio, produtos, pedidos, identidade, banners, impressora, pagamentos, configurações, duplicar estrutura, zerar dados, assinatura).\n4. Para voltar ao Admin Master, use o link **Voltar ao Admin Master** na barra lateral." },
      { q: "Como o dono do restaurante acessa o painel dele?", a: "1. Você (Admin Master) cria o usuário em **/admin/users** → **Novo usuário** → escolhe papel **Admin do Restaurante** + vincula ao cliente.\n2. Envia e-mail e senha temporária para o dono.\n3. O dono entra em **/auth**, faz login e é redirecionado para **/panel** (apenas o painel do restaurante dele — nunca vê outros clientes nem o Admin Master)." },
      { q: "Como o VENDEDOR (garçom) acessa o app dele?", a: "1. O Admin do Restaurante (ou você como Admin Master) cria o vendedor em **/panel/sellers** (ou **/admin/users** com papel Vendedor).\n2. O vendedor entra em **/auth** com e-mail+senha e é redirecionado AUTOMATICAMENTE para **/seller** (interface 100% mobile com navegação inferior: Início, Mesas, Pedidos).\n3. Ele NÃO consegue acessar /admin nem /panel — só o app de vendedor.\n4. O limite de vendedores é controlado pela assinatura do tenant (vendedores inclusos + extras)." },
      { q: "Como o cliente final usa o totem?", a: "1. Em **/admin/tenants** clique no ícone de **QR Code** do cliente para baixar o QR/link público.\n2. Imprima/cole o QR no totem físico ou na mesa.\n3. Ao acessar, o totem abre direto na marca, idioma e cardápio daquele restaurante (resolvido por **domínio personalizado** ou **slug**)." },
      { q: "Operador ou cozinha — como dou acesso?", a: "Em **/admin/users** crie usuário com papel **Operator** (caixa/pedidos) ou **Kitchen** (somente visão de cozinha). Vincule ao cliente. Eles acessam **/panel** mas só veem as áreas permitidas pelo papel." },
    ],
  },
  {
    title: "Clientes (Tenants)",
    items: [
      { q: "Como criar um novo cliente?", a: "Vá em **Clientes** no menu lateral e clique em **Novo cliente com IA** (recomendado, faz tudo guiado) ou em **Manual**. Preencha nome, slug, plano, limite de pedidos e domínio próprio (opcional). Ao salvar, o sistema cria o cliente, a loja inicial e as configurações padrão." },
      { q: "Como acessar o painel completo de um cliente?", a: "Em **Clientes**, clique no botão **Acessar projeto** no card do cliente. Isso abre o painel interno escopado nele (cardápio, produtos, pedidos, identidade visual, etc.) sem misturar dados com outros clientes." },
      { q: "Como duplicar um projeto inteiro?", a: "Dentro do painel do cliente, clique em **Duplicar estrutura**. Você escolhe nome e slug do novo cliente e pode marcar/desmarcar copiar **produtos**, **imagens** e **banners**. Categorias, identidade visual e fluxo são sempre copiados." },
      { q: "Como desativar um cliente?", a: "Em **Clientes**, edite o cliente e desligue o switch **Ativo**. Clientes inativos não aparecem nas rotas públicas e o painel deles fica bloqueado." },
    ],
  },
  {
    title: "Cardápio e Produtos",
    items: [
      { q: "Onde cadastro produtos?", a: "Acesse o cliente → **Cardápio**. Crie categorias primeiro, depois produtos dentro de cada categoria. Cada produto tem nome, descrição, preço, imagem, tamanhos, adicionais e pode ser marcado como bestseller ou promo." },
      { q: "Como gerar imagens dos produtos por IA?", a: "No card de cada produto há um botão **Gerar imagem com IA**. A IA gera uma foto fotorrealista baseada no nome do produto. O estilo padrão (realista/3D/flatlay/minimal) é definido em **Configurações → IA**." },
      { q: "Como importar um cardápio inteiro?", a: "Em **Cardápio**, clique em **Importar com IA**. Cole o cardápio em texto livre (foto, PDF transcrito, etc.) e a IA cria categorias e produtos automaticamente." },
    ],
  },
  {
    title: "Identidade Visual e Banners",
    items: [
      { q: "Onde mudo as cores e logos?", a: "Painel do cliente → **Identidade visual**. Define cor primária, secundária, CTA, header, fundo, fonte, logos (claro/escuro) e ícones de modo (comer aqui / para levar)." },
      { q: "Como adicionar banners promocionais?", a: "Painel do cliente → **Banner**. Suporta imagens e vídeos, link clicável, autoplay, mute, ordenação e ativar/desativar individualmente." },
    ],
  },
  {
    title: "Pagamentos e Impressora",
    items: [
      { q: "Como configurar métodos de pagamento?", a: "Painel do cliente → **Pagamentos**. Ative cartão, dinheiro, Pix, Apple Pay, Google Pay, link e pagamento no balcão. Define mensagens exibidas no totem." },
      { q: "Como conectar uma impressora térmica?", a: "Painel do cliente → **Impressora**. Informe IP e porta (padrão 9100) e o endpoint do agente local. Use **Testar impressão** para validar." },
      { q: "Como mapear categorias para cada impressora?", a: "Em **Impressora**, vincule cada categoria à impressora correspondente (cozinha, bar, etc.). Ao receber pedido, cada item é roteado automaticamente." },
    ],
  },
  {
    title: "Domínio próprio e Publicação",
    items: [
      { q: "Como configurar domínio próprio para o cliente?", a: "Em **Clientes** → editar → **Domínio próprio**. Aponte o DNS do cliente (registro A) para o IP da plataforma. Quando alguém acessar esse domínio, o totem abre direto no cliente sem precisar do slug na URL." },
      { q: "Como obter o link e QR do totem?", a: "Em **Clientes**, clique no ícone de QR no card do cliente. Você vê a URL pública e baixa o QR code para imprimir/colar no totem físico." },
    ],
  },
  {
    title: "Usuários e Permissões",
    items: [
      { q: "Como criar o login do dono de um restaurante?", a: "Vá em **Usuários** → **Novo usuário**. Informe e-mail, senha temporária, nome, escolha o papel **Admin do Restaurante** e vincule ao cliente. O dono receberá acesso somente ao painel daquele restaurante." },
      { q: "Quem é Admin Master?", a: "Você. Tem acesso a todos os clientes, pode criar/editar/duplicar/desativar e ver relatórios globais. O dono do restaurante nunca vê outros clientes nem o Admin Master." },
    ],
  },
  {
    title: "Conversas IA e Reset",
    items: [
      { q: "Onde ficam minhas conversas com a IA?", a: "Aba **Conversas IA** no menu lateral. Toda conversa é salva automaticamente com título gerado pelo conteúdo, data/hora e cliente vinculado (se houver). Pode abrir, pesquisar e excluir." },
      { q: "Como zerar dados de um cliente?", a: "Painel do cliente → **Configurações** → **Zona perigosa** → **Zerar dados**. Você escolhe o que apagar (pedidos, caixa, estoque, produtos, categorias, banners) e confirma com sua senha." },
    ],
  },
];

export default function GuidePage() {
  const [q, setQ] = useState("");
  const filter = q.trim().toLowerCase();
  const filtered = SECTIONS.map((s) => ({
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
          Guia passo a passo de tudo que existe na plataforma.
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