import LegalPageLayout from "@/components/legal/LegalPageLayout";
import LegalSection from "@/components/legal/LegalSection";
import { LEGAL_SITE } from "@/lib/legalSite";

export default function PrivacyPage() {
  const { appName, platformName, companyName, privacyEmail, supportEmail, siteUrl } = LEGAL_SITE;

  return (
    <LegalPageLayout
      title="Política de Privacidade"
      description={`Esta política explica como o ${appName} (operado através da plataforma ${platformName}) recolhe, utiliza, partilha e protege os seus dados pessoais.`}
    >
      <LegalSection title="1. Quem somos">
        <p>
          O aplicativo e site <strong>{siteUrl}</strong> são disponibilizados por{" "}
          <strong>{companyName}</strong>, responsável pelo tratamento dos dados no âmbito da
          plataforma <strong>{platformName}</strong>, utilizada pelo restaurante <strong>{appName}</strong>{" "}
          para encomendas online, gestão operacional e pagamentos.
        </p>
        <p>
          Contacto de privacidade:{" "}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que recolhemos">
        <ul>
          <li><strong>Conta e autenticação:</strong> nome, e-mail, telefone, identificador de utilizador, palavra-passe (armazenada de forma segura), perfil de acesso.</li>
          <li><strong>Encomendas:</strong> produtos, personalizações, morada ou mesa, observações, histórico e estado da entrega.</li>
          <li><strong>Pagamentos:</strong> método seleccionado e identificadores de transacção. Dados de cartão processados pela <strong>Stripe</strong>.</li>
          <li><strong>Localização e entrega:</strong> morada, zona e dados para calcular taxas.</li>
          <li><strong>Comunicações:</strong> preferências push, tokens de dispositivo e mensagens de suporte.</li>
          <li><strong>Dados técnicos:</strong> IP, dispositivo, navegador, cookies e armazenamento local necessários.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidade do tratamento">
        <ul>
          <li>Processar encomendas, pagamentos e entregas.</li>
          <li>Criar e gerir contas de clientes, equipa e restaurante.</li>
          <li>Enviar notificações sobre pedidos ou campanhas autorizadas.</li>
          <li>Prevenir fraude, abusos e incidentes de segurança.</li>
          <li>Cumprir obrigações legais, fiscais e contabilísticas.</li>
          <li>Melhorar experiência, desempenho e fiabilidade.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal (GDPR / LGPD)">
        <p>Tratamos dados com base na execução do contrato, cumprimento legal, interesse legítimo e, quando aplicável, consentimento.</p>
        <p>Aplicam-se direitos do <strong>RGPD</strong> (UE) e da <strong>LGPD</strong> (Brasil), conforme o caso.</p>
      </LegalSection>

      <LegalSection title="5. Cookies e analytics">
        <p>Utilizamos cookies e armazenamento local para sessão, idioma, carrinho, loja seleccionada e funcionamento da app instalada.</p>
        <p>Podemos recolher métricas agregadas de utilização. Não vendemos dados para publicidade.</p>
      </LegalSection>

      <LegalSection title="6. Serviços de terceiros">
        <ul>
          <li><strong>Stripe</strong>, pagamentos.</li>
          <li><strong>Supabase</strong>, base de dados e autenticação.</li>
          <li><strong>Push notifications</strong>, alertas de pedidos.</li>
          <li><strong>Alojamento/CDN</strong>, entrega do site e app.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Partilha de dados">
        <p>Partilhamos dados apenas com o restaurante, processadores de pagamento, prestadores técnicos e quando exigido por lei.</p>
      </LegalSection>

      <LegalSection title="8. Conservação">
        <p>Mantemos dados enquanto a conta estiver activa ou forem necessários. Após eliminação, removemos ou anonimizamos conforme <a href="/delete-account">Exclusão de Conta</a>.</p>
      </LegalSection>

      <LegalSection title="9. Os seus direitos">
        <ul>
          <li>Aceder, corrigir ou actualizar dados.</li>
          <li>Portabilidade, oposição e retirada de consentimento.</li>
          <li>Solicitar eliminação da conta.</li>
          <li>Reclamar junto da autoridade de protecção de dados.</li>
        </ul>
        <p>Contacto: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> ou <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </LegalSection>

      <LegalSection title="10. Segurança">
        <p>Usamos HTTPS/TLS, controlos de acesso e boas práticas de segurança. Notificaremos incidentes relevantes quando a lei exigir.</p>
      </LegalSection>

      <LegalSection title="11. Menores">
        <p>O serviço destina-se a maiores de idade legal para contratar. Não recolhemos dados de menores sem autorização dos responsáveis.</p>
      </LegalSection>

      <LegalSection title="12. Alterações">
        <p>Podemos actualizar esta política. A data da última versão aparece no topo. O uso continuado implica aceitação.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
