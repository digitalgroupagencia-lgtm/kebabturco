Plano direto para corrigir o erro do bootstrap:

1. Alterar `supabase/scripts/BOOTSTRAP_MASTER_TEMPLATE.sql` na seção `PRINTER SETTINGS`.
2. Trocar o valor inválido `print_mode = 'native'` por `print_mode = 'bridge'`, que é aceito pelo banco e já é o padrão usado pelo código.
3. Não mexer em chaves, não mexer em Cloud, não mexer em outras partes do app.
4. Depois da correção, você pode copiar novamente o `BOOTSTRAP_MASTER_TEMPLATE.sql` pela Central White Label e rodar de novo; como o script usa `ON CONFLICT DO NOTHING`, ele deve continuar de onde parou sem duplicar o que já entrou.