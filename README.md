# Campanha Promocional — versão final

Aplicação mobile-first para gerenciar uma campanha com **200 números (001–200)**,
seleção múltipla, reserva temporária, pagamento por **Pix ou dinheiro**, confirmação
manual pelo responsável e prova criptográfica de integridade do sorteio.

> **Uso legal:** o sistema é uma ferramenta técnica para campanhas/promocoes que
> estejam em conformidade com a legislação aplicável. A prova criptográfica não
> substitui autorização oficial, auditoria independente ou exigências regulatórias.

## Fluxo final aprovado

1. O responsável configura campanha, preço, Pix, WhatsApp e prazo de reserva.
2. Antes de liberar vendas, o responsável cria a **prova pública do sorteio**.
3. O sistema gera uma ordem secreta dos 200 números e publica somente um hash SHA-256.
4. O comprador escolhe um ou vários números.
5. O servidor calcula o valor: **quantidade × preço por número**.
6. Os números ficam **reservados / aguardando pagamento** pelo prazo definido pelo responsável.
7. Ninguém mais consegue selecionar esses números enquanto a reserva estiver válida.
8. O comprador paga por Pix ou dinheiro e pode enviar o comprovante pelo WhatsApp.
9. O responsável confere o pagamento e clica em **Confirmar pagamento**.
10. Todos os números daquela compra passam juntos para **Vendidos / Confirmados**.
11. Se o prazo vencer sem confirmação, a reserva expira e os números voltam a ficar disponíveis.
12. Depois do encerramento, a ordem secreta é revelada e vence o **primeiro número confirmado** encontrado nessa ordem.

## O que está implementado

- 200 números, de **001 a 200**.
- Valor padrão de **R$ 10,00 por número** (editável antes do bloqueio do sorteio).
- Seleção de vários números em uma única compra.
- Valor final calculado no **servidor**, nunca informado pelo comprador.
- Pix simples: chave/QR Code + valor exato da reserva.
- Pagamento por dinheiro.
- Envio de comprovante pelo WhatsApp.
- Prazo de reserva configurável em horas, por exemplo **6h ou 24h**.
- Expiração automática de reservas não confirmadas.
- Um único responsável administrativo.
- Painel separando números disponíveis, reservados e confirmados.
- Resumo consolidado por comprador.
- Lista de compras com nome, WhatsApp, números, quantidade, forma de pagamento, valor, prazo e status.
- Busca por nome, telefone ou número.
- Confirmação/cancelamento da compra inteira de forma atômica.
- Bloqueio contra dupla reserva com travas no Postgres.
- Nenhuma reserva é aceita antes da prova do sorteio estar bloqueada.
- Nenhuma confirmação/cancelamento que altere elegibilidade é aceita após o encerramento.
- Upload de imagem do prêmio e QR Code pelo painel.
- Prova SHA-256 baseada em uma **ordem secreta dos 200 números**.
- Código público de verificação visível durante a campanha.
- Ordem e nonce revelados após o encerramento para conferência pública.

## Stack

- Next.js 15.5 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Supabase: Postgres, Auth, RLS e Storage
- Cloudflare Turnstile (proteção contra abuso na criação de reservas)

## 1. Configurar Supabase

Crie um projeto no Supabase, abra **SQL Editor** e execute todo o conteúdo de:

`supabase/schema.sql`

O script cria tabelas, políticas RLS, funções de reserva/expiração, funções do
sorteio verificável e o bucket `campaign-assets`.

> Se você já executou uma versão antiga **de teste** com reservas/vendas reais no
> mesmo banco, prefira um projeto Supabase limpo para a liberação final. O schema
> migra estruturas simples, mas uma prova criptográfica antiga criada antes da
> ordem secreta não deve ser reaproveitada após existirem vendas.

### Primeiro e único responsável

Em **Authentication → Users**, crie um usuário com e-mail e senha. Copie o UUID e rode:

```sql
insert into public.admin_users (id, name, role)
values ('UUID_DO_USUARIO', 'Responsável', 'owner');
```

O banco impede o cadastro de um segundo administrador.

## 2. Variáveis de ambiente

Crie `.env.local` a partir de `.env.local.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

NEXT_PUBLIC_TURNSTILE_SITE_KEY=sua-site-key
TURNSTILE_SECRET_KEY=sua-secret-key
```

- `SUPABASE_SECRET_KEY` e `TURNSTILE_SECRET_KEY` são só de servidor — nunca
  aparecem no navegador. Nunca prefixe nenhuma delas com `NEXT_PUBLIC_`.
- Em projeto Supabase legado (sem as chaves publishable/secret ainda), use
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no lugar — o
  app aceita os dois formatos.
- Crie o site do Turnstile em
  [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile).
  Sem `TURNSTILE_SECRET_KEY` configurada, a criação de reservas fica bloqueada
  de propósito (falha fechada) — não é um recurso opcional.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

- Página pública: `http://localhost:3000`
- Painel: `http://localhost:3000/admin`

## 4. Configurar a campanha

Em `/admin/settings` configure:

- título e descrição;
- imagem do prêmio;
- valor por número;
- data inicial e final;
- prazo da reserva em horas;
- nome/chave/QR Code Pix;
- instruções de pagamento;
- WhatsApp do responsável;
- regulamento e autorização, quando aplicável.

O seed inicial usa **200 números**, **R$ 10,00** e data final **10/10/2026**.

## 5. Liberar as reservas

Depois de revisar todas as configurações, na seção **Integridade do sorteio** clique em:

**Criar e bloquear prova do sorteio**

Antes desse clique, a página pública não permite reservar números.

Depois do bloqueio, os parâmetros críticos vinculados à prova não podem ser alterados
pelo aplicativo. O hash SHA-256 fica público, mas a ordem dos 200 números permanece
secreta até o encerramento.

## 6. Exemplo de compra

João escolhe:

`003, 013, 147`

Com preço de R$ 10,00, o servidor grava:

`João — 3 números — Pix — R$ 30,00 — Aguardando confirmação`

Se o prazo estiver configurado em 6 horas, os três números ficam indisponíveis para
outras pessoas durante essas 6 horas.

Quando o responsável confere o Pix e clica em **Confirmar pagamento**, os três
números passam juntos para **Confirmados/Vendidos**.

Se não houver confirmação antes do vencimento, a compra fica **Expirada** e os três
números voltam a ficar disponíveis.

## 7. Regra do sorteio verificável

Antes das reservas, o banco cria uma ordem aleatória com todos os números, por exemplo:

`137 → 021 → 184 → 003 → ...`

Essa ordem não é exibida. O sistema publica apenas um SHA-256 construído com:

- ID da campanha;
- total de números;
- data final;
- ordem completa;
- nonce aleatório de 256 bits.

Depois do encerramento, ordem + nonce são revelados. O navegador recalcula o SHA-256.
O vencedor é o **primeiro número da ordem que estiver confirmado**.

Se 137 não foi vendido, ele é ignorado. Se 021 estiver confirmado, 021 vence.

## 8. Deploy no Vercel

1. Suba o projeto para um repositório Git.
2. Importe o repositório no Vercel.
3. Configure as cinco variáveis (Supabase + Turnstile) em Project Settings > Environment Variables.
4. Faça o deploy.
5. Teste uma reserva completa antes de divulgar o link.

## Segurança da criação de reservas

`create_purchase` não tem mais permissão de execução para `anon`/`authenticated`
— só o papel `service_role` (chave secreta) consegue chamá-la. O fluxo do
comprador passou a ser:

navegador → Turnstile → Server Action → valida o Turnstile no servidor →
Supabase com a chave secreta → `create_purchase` → banco.

Ou seja, mesmo alguém com a chave publishable do projeto (a mesma que fica no
código do navegador) não consegue mais chamar `create_purchase` diretamente
pela API do Supabase — só o servidor da aplicação consegue, e só depois de
validar o Turnstile.

## Checklist antes de divulgar

- [ ] Schema executado no Supabase sem erros.
- [ ] Único usuário administrador criado.
- [ ] 200 números visíveis.
- [ ] Pix e WhatsApp cadastrados.
- [ ] Prazo de reserva escolhido.
- [ ] Preço revisado.
- [ ] Datas revisadas.
- [ ] Prova do sorteio bloqueada.
- [ ] Compra teste realizada.
- [ ] Reserva aparece no painel.
- [ ] Confirmação transforma todos os números da compra em vendidos.
- [ ] Cancelamento/expiração libera os números novamente.

## Limite técnico da prova

A prova criptográfica detecta alterações feitas pelo aplicativo/banco dentro desse
modelo. Uma pessoa com controle administrativo total da infraestrutura ainda possui
poder superior ao usuário comum. Para garantia independente contra o próprio operador
da infraestrutura seria necessário ancorar o hash em um serviço externo de timestamp
ou auditoria.
