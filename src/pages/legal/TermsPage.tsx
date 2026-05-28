import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection from "@/components/legal/LegalSection";
import { LEGAL_SITE } from "@/lib/legalSite";

export default function TermsPage() {
  const { appName, platformName, companyName, supportEmail, siteUrl } = LEGAL_SITE;

  return (
    <LegalPageLayout
      title="Termos de Uso"
      description={`Leia estes termos antes de utilizar o ${appName} e a plataforma ${platformName}.`}
    >
      <LegalSection title="1. Aceitação">
        <p>Estes Termos regulam o uso do site <strong>{siteUrl}</strong>, aplicativo, PWA e TWA operados por <strong>{companyName}</strong> via <strong>{platformName}</strong> para <strong>{appName}</strong>.</p>
      </LegalSection>
      <LegalSection title="2. Descrição do serviço">
        <p>Consulta de cardápio, personalização, encomendas, pagamentos, acompanhamento de pedidos e gestão operacional para utilizadores autorizados.</p>
      </LegalSection>
      <LegalSection title="3. Conta e acesso">
        <ul>
          <li>Informações verdadeiras e actualizadas.</li>
          <li>Confidencialidade das credenciais.</li>
          <li>Contas de equipa pessoais e intransmissíveis.</li>
          <li>Suspensão por abuso, fraude ou violação destes termos.</li>
        </ul>
      </LegalSection>
      <LegalSection title="4. Uso correcto">
        <ul>
          <li>Uso lícito do serviço.</li>
          <li>Sem interferência com segurança ou disponibilidade.</li>
          <li>Sem encomendas falsas ou abuso de promoções.</li>
        </ul>
      </LegalSection>
      <LegalSection title="5. Encomendas">
        <p>Preços, produtos e horários podem mudar. Imagens ilustrativas. O restaurante pode recusar pedidos por indisponibilidade ou erro manifesto.</p>
      </LegalSection>
      <LegalSection title="6. Pagamentos e reembolsos">
        <p>Pagamentos via Stripe. Reembolsos: contacte <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Análise em {LEGAL_SITE.responseTime}.</p>
      </LegalSection>
      <LegalSection title="7. Responsabilidades">
        <p>Cliente, restaurante e {companyName} têm deveres específicos descritos na plataforma e na lei aplicável.</p>
      </LegalSection>
      <LegalSection title="8. Limitação">
        <p>Na extensão legal, {companyName} não responde por danos indirectos ou eventos fora de controlo razoável.</p>
      </LegalSection>
      <LegalSection title="9. Propriedade intelectual">
        <p>Conteúdos e software são protegidos. Proibida cópia ou reutilização comercial sem autorização.</p>
      </LegalSection>
      <LegalSection title="10. Privacidade">
        <p>Ver <a href="/privacy">Política de Privacidade</a>.</p>
      </LegalSection>
      <LegalSection title="11. Rescisão">
        <p>Pode deixar de usar o serviço. Eliminação de conta: <a href="/delete-account">Exclusão de Conta</a>.</p>
      </LegalSection>
      <LegalSection title="12. Contacto">
        <p><a href={`mailto:${supportEmail}`}>{supportEmail}</a> · <a href="/support">Suporte</a></p>
      </LegalSection>
    </LegalPageLayout>
  );
}
