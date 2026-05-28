import { Link } from "react-router-dom";
import { Clock, HelpCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection from "@/components/legal/LegalSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LEGAL_SITE } from "@/lib/legalSite";

const FAQ = [
  { q: "Não consigo entrar na conta.", a: "Use recuperação de palavra-passe ou contacte suporte com o e-mail registado." },
  { q: "Pagamento cobrado mas pedido falhou.", a: "Envie e-mail, data e valor para verificarmos com restaurante e Stripe." },
  { q: "Como acompanho o pedido?", a: "Use o ecrã de acompanhamento ou link recebido após encomenda." },
  { q: "Como elimino a conta?", a: "Veja Exclusão de Conta e envie pedido por e-mail." },
  { q: "Preciso de acesso de equipa.", a: "Peça ao gestor na área Equipe do restaurante." },
  { q: "App não instala.", a: "Actualize o navegador; no iPhone use Safari e Adicionar à Tela de Início." },
] as const;

export default function SupportPage() {
  const { appName, supportEmail, privacyEmail, responseTime } = LEGAL_SITE;

  return (
    <LegalPageLayout
      title="Suporte e Contacto"
      description={`Ajuda com conta, pedidos, pagamentos e problemas técnicos do ${appName}.`}
      highlight={
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4"><Mail className="h-5 w-5 text-primary mb-2" /><p className="font-bold text-sm">Suporte</p><a href={`mailto:${supportEmail}`} className="text-sm text-primary underline break-all">{supportEmail}</a></Card>
          <Card className="p-4"><ShieldCheck className="h-5 w-5 text-primary mb-2" /><p className="font-bold text-sm">Privacidade</p><a href={`mailto:${privacyEmail}`} className="text-sm text-primary underline break-all">{privacyEmail}</a></Card>
        </div>
      }
    >
      <LegalSection title="Como podemos ajudar">
        <ul>
          <li>Login, acesso e contas de equipa.</li>
          <li>Pedidos, entregas e pagamentos.</li>
          <li>Reembolsos e erros técnicos.</li>
          <li>Privacidade e exclusão de dados.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Antes de escrever">
        <p>Inclua nome, e-mail, unidade (Gandia/Playa) e referência do pedido se aplicável.</p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button asChild><a href={`mailto:${supportEmail}`}><MessageCircle className="mr-2 h-4 w-4" />Contactar suporte</a></Button>
          <Button asChild variant="outline"><Link to="/delete-account">Exclusão de conta</Link></Button>
        </div>
      </LegalSection>
      <LegalSection title="Prazos">
        <p className="flex gap-2"><Clock className="h-4 w-4 text-primary shrink-0 mt-1" />Resposta inicial em <strong>{responseTime}</strong> (dias úteis).</p>
      </LegalSection>
      <LegalSection title="Perguntas frequentes">
        <div className="space-y-3">{FAQ.map((item) => (
          <div key={item.q} className="rounded-xl border p-4">
            <p className="font-semibold text-sm flex gap-2"><HelpCircle className="h-4 w-4 text-primary" />{item.q}</p>
            <p className="text-sm text-muted-foreground mt-2 pl-6">{item.a}</p>
          </div>
        ))}</div>
      </LegalSection>
      <LegalSection title="Documentos">
        <ul><li><Link to="/privacy">Privacidade</Link></li><li><Link to="/terms">Termos</Link></li><li><Link to="/delete-account">Exclusão de conta</Link></li></ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
