import { Link } from "react-router-dom";
import { AlertTriangle, Mail } from "lucide-react";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection from "@/components/legal/LegalSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LEGAL_SITE } from "@/lib/legalSite";

export default function DeleteAccountPage() {
  const { appName, platformName, supportEmail, privacyEmail, deletionTime, retentionNote } = LEGAL_SITE;

  return (
    <LegalPageLayout
      title="Exclusão de Conta e Dados"
      description={`Como solicitar eliminação de conta e dados no ${appName} (${platformName}).`}
      highlight={
        <Card className="border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-bold text-foreground">A eliminação é permanente</p>
              <p className="text-muted-foreground">Não será possível recuperar histórico, preferências ou acesso após conclusão.</p>
            </div>
          </div>
        </Card>
      }
    >
      <LegalSection title="1. Quem pode solicitar">
        <ul>
          <li><strong>Clientes</strong> com conta ou histórico de pedidos.</li>
          <li><strong>Equipa</strong>, pelo utilizador ou administrador do restaurante.</li>
          <li><strong>Titulares de dados</strong> que contactaram suporte, mesmo sem conta activa.</li>
        </ul>
      </LegalSection>
      <LegalSection title="2. Como solicitar">
        <ol>
          <li>E-mail para <a href={`mailto:${supportEmail}`}>{supportEmail}</a> ou <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</li>
          <li>Página <Link to="/support">Suporte</Link> com assunto «Exclusão de conta».</li>
          <li>Gestor remove utilizador na Equipe e solicita eliminação completa por e-mail.</li>
        </ol>
        <p>Inclua: nome, e-mail da conta, tipo de conta e confirmação explícita do pedido.</p>
        <Button asChild className="mt-2"><a href={`mailto:${supportEmail}?subject=Pedido%20de%20exclus%C3%A3o%20de%20conta`}><Mail className="mr-2 h-4 w-4" />Enviar pedido</a></Button>
      </LegalSection>
      <LegalSection title="3. Prazo">
        <p>Confirmação em {LEGAL_SITE.responseTime}. Eliminação concluída em até <strong>{deletionTime}</strong>, salvo retenção legal.</p>
      </LegalSection>
      <LegalSection title="4. Dados eliminados">
        <ul>
          <li>Perfil, credenciais, preferências e endereços guardados.</li>
          <li>Histórico identificável de pedidos, quando permitido por lei.</li>
        </ul>
      </LegalSection>
      <LegalSection title="5. Dados que podem ser mantidos">
        <p>{retentionNote}</p>
        <ul>
          <li>Registos fiscais e comprovativos de pagamento.</li>
          <li>Logs de segurança e antifraude pelo período mínimo necessário.</li>
        </ul>
      </LegalSection>
      <LegalSection title="6. Consequências">
        <p>Perda de acesso, histórico e benefícios (fidelidade/cupões) ligados à conta.</p>
      </LegalSection>
      <LegalSection title="7. Mais informação">
        <p><Link to="/privacy">Política de Privacidade</Link> · direitos RGPD/LGPD junto da autoridade competente.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
