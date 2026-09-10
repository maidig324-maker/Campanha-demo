# Roteiro de teste antes de divulgar

Execute estes testes no Supabase/Vercel antes de entregar o link ao público.

## 1. Configuração inicial

- Execute `supabase/schema.sql` sem erros.
- Crie o único responsável em `auth.users` + `admin_users`.
- Abra `/admin/settings`.
- Confira 200 números e preço de R$ 10,00.
- Configure Pix, WhatsApp e prazo de reserva (ex.: 6 horas).

## 2. Proteção do sorteio

- Antes de bloquear a prova, a página pública deve mostrar os números sem permitir reserva.
- Clique em `Criar e bloquear prova do sorteio`.
- Confirme que a página pública passa a aceitar seleção.
- Confirme que o hash SHA-256 fica visível.
- Confirme que datas e valor por número ficam bloqueados no painel.

## 3. Reserva de João

Escolha `003, 013, 147`.

Resultado esperado:

- total = R$ 30,00;
- Pix só aparece depois da reserva criada;
- os três números ficam com status `reserved`;
- painel mostra João, 3 números, forma de pagamento, R$ 30,00 e horário de expiração;
- outra sessão/navegador não consegue reservar nenhum dos três.

## 4. Confirmação

No painel, clique em `Confirmar pagamento`.

Resultado esperado:

- os três números passam juntos para `confirmed`;
- painel contabiliza 3 vendidos/confirmados;
- arrecadação confirmada aumenta R$ 30,00.

## 5. Expiração

Para testar rapidamente, configure o prazo para 1 hora ou altere temporariamente
`expires_at` de uma reserva de teste no banco para um horário passado.

Depois atualize a página pública ou o painel.

Resultado esperado:

- compra passa para `expired`;
- números voltam para `available`;
- outra pessoa consegue reservá-los.

## 6. Cancelamento

Crie outra reserva e cancele pelo painel.

Resultado esperado:

- compra passa para `canceled`;
- todos os números daquela compra voltam para `available`.

## 7. Comprador recorrente

Use o mesmo WhatsApp em duas compras diferentes.

Resultado esperado:

- compras continuam separadas para conferência individual;
- `Resumo por comprador` soma os números ativos da mesma pessoa.

## 8. Encerramento / sorteio

Em ambiente de teste, use uma campanha com data final anterior à data atual.
Após o encerramento, abra a página pública.

Resultado esperado:

- reservas não confirmadas são expiradas;
- ordem secreta + nonce são revelados;
- navegador recalcula o SHA-256;
- prova aparece como válida;
- vencedor é o primeiro número confirmado da ordem revelada;
- painel não aceita confirmação/cancelamento que altere elegibilidade depois do encerramento.
