-- ============================================================================
-- CAMPANHA PROMOCIONAL — VERSÃO FINAL
-- 200 números | compra múltipla | reserva temporária | Pix manual
-- confirmação pelo responsável | sorteio verificável por ordem secreta
-- ============================================================================
-- IMPORTANTE: use esta aplicação somente em campanhas compatíveis com a
-- legislação aplicável. A prova criptográfica aumenta a transparência do
-- software, mas não substitui autorização oficial ou auditoria quando exigidas.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Campanha
-- ----------------------------------------------------------------------------
create table if not exists public.campaigns (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null default 'Campanha Promocional',
  description           text not null default '',
  image_url             text,
  start_date            date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  end_date              date not null,
  total_numbers         int not null default 200 check (total_numbers > 0 and total_numbers <= 1000),
  ticket_price          numeric(10,2) not null default 10.00 check (ticket_price > 0),
  status                text not null default 'active' check (status in ('draft','active','finished','canceled')),
  regulation_text       text not null default '',
  authorization_number  text,
  draw_commitment       text,
  draw_locked_at        timestamptz,
  draw_revealed_at      timestamptz,
  winning_number        int,
  draw_nonce            text,
  draw_order            int[],
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.campaigns add column if not exists ticket_price numeric(10,2) not null default 10.00;
alter table public.campaigns add column if not exists draw_commitment text;
alter table public.campaigns add column if not exists draw_locked_at timestamptz;
alter table public.campaigns add column if not exists draw_revealed_at timestamptz;
alter table public.campaigns add column if not exists winning_number int;
alter table public.campaigns add column if not exists draw_nonce text;
alter table public.campaigns add column if not exists draw_order int[];

-- Corrige o default de start_date em bancos que já existiam antes desta versão:
-- current_date usa o fuso da sessão (normalmente UTC no Postgres do Supabase),
-- enquanto toda a checagem de período (create_purchase, reveal_draw_if_due etc.)
-- usa America/Sao_Paulo. Sem isso, uma campanha criada/semeada entre 21h e
-- meia-noite (horário de SP) nasce com start_date um dia "no futuro" segundo o
-- calendário de SP, e create_purchase recusa reservas até o dia seguinte.
alter table public.campaigns alter column start_date set default ((now() at time zone 'America/Sao_Paulo')::date);

-- ----------------------------------------------------------------------------
-- 2. Configurações públicas de pagamento/contato
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id                      uuid primary key default gen_random_uuid(),
  campaign_id             uuid not null unique references public.campaigns(id) on delete cascade,
  pix_receiver_name       text,
  pix_key                 text,
  pix_qr_code_url         text,
  payment_instructions    text,
  whatsapp_number         text,
  reservation_hold_hours  int not null default 6 check (reservation_hold_hours between 1 and 168),
  updated_at              timestamptz not null default now()
);

alter table public.settings add column if not exists reservation_hold_hours int not null default 6;
alter table public.settings drop constraint if exists settings_reservation_hold_hours_check;
alter table public.settings add constraint settings_reservation_hold_hours_check check (reservation_hold_hours between 1 and 168) not valid;
alter table public.settings validate constraint settings_reservation_hold_hours_check;

-- ----------------------------------------------------------------------------
-- 3. Participantes — um mesmo WhatsApp reaproveita o mesmo cadastro
-- ----------------------------------------------------------------------------
create table if not exists public.participants (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  whatsapp             text not null,
  whatsapp_normalized  text,
  created_at           timestamptz not null default now()
);

alter table public.participants add column if not exists whatsapp_normalized text;
update public.participants
set whatsapp_normalized = regexp_replace(whatsapp, '[^0-9]', '', 'g')
where whatsapp_normalized is null;
drop index if exists public.idx_participants_whatsapp_normalized;
create index if not exists idx_participants_whatsapp_normalized
  on public.participants (whatsapp_normalized);

-- ----------------------------------------------------------------------------
-- 4. Compras/reservas agrupadas
-- ----------------------------------------------------------------------------
create table if not exists public.purchases (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references public.campaigns(id) on delete cascade,
  participant_id        uuid not null references public.participants(id) on delete restrict,
  payment_method        text not null check (payment_method in ('pix','dinheiro')),
  status                text not null default 'reserved' check (status in ('reserved','confirmed','canceled','expired')),
  total_amount          numeric(10,2) not null default 0 check (total_amount >= 0),
  notes                 text not null default '',
  expires_at            timestamptz,
  expired_at            timestamptz,
  confirmed_at          timestamptz,
  confirmed_by          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.purchases add column if not exists expires_at timestamptz;
alter table public.purchases add column if not exists expired_at timestamptz;

-- Atualiza constraint antiga para aceitar "expired".
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases
  add constraint purchases_status_check
  check (status in ('reserved','confirmed','canceled','expired')) not valid;
alter table public.purchases validate constraint purchases_status_check;

-- ----------------------------------------------------------------------------
-- 5. Números da campanha
-- ----------------------------------------------------------------------------
create table if not exists public.numbers (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  number         int not null,
  status         text not null default 'available' check (status in ('available','reserved','confirmed')),
  purchase_id    uuid references public.purchases(id) on delete set null,
  updated_at     timestamptz not null default now(),
  unique (campaign_id, number)
);

alter table public.numbers add column if not exists purchase_id uuid references public.purchases(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 6. Números que pertencem a cada compra
-- ----------------------------------------------------------------------------
create table if not exists public.purchase_numbers (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  number_id   uuid not null references public.numbers(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (purchase_id, number_id)
);

-- ----------------------------------------------------------------------------
-- 7. Único responsável administrativo
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  role        text not null default 'owner' check (role in ('admin','owner')),
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_single_admin_user on public.admin_users ((1));

-- ----------------------------------------------------------------------------
-- 8. Segredo da ordem do sorteio
-- Nunca existe policy pública de leitura nesta tabela.
-- ----------------------------------------------------------------------------
create table if not exists public.draw_secrets (
  campaign_id   uuid primary key references public.campaigns(id) on delete cascade,
  number_order  int[],
  nonce         text not null,
  created_at    timestamptz not null default now()
);

alter table public.draw_secrets add column if not exists number_order int[];

-- Se uma versão de teste anterior já bloqueou um sorteio usando apenas um
-- número secreto e ainda NÃO existem reservas/vendas, limpa aquela prova para
-- permitir gerar a nova ordem secreta dos 200 números.
do $$
declare
  v_id uuid;
begin
  for v_id in
    select c.id
    from public.campaigns c
    left join public.draw_secrets d on d.campaign_id = c.id
    where c.draw_locked_at is not null
      and d.number_order is null
      and not exists (
        select 1 from public.purchases p
        where p.campaign_id = c.id and p.status in ('reserved','confirmed')
      )
  loop
    perform set_config('app.draw_internal', '1', true);
    update public.campaigns
    set draw_commitment = null,
        draw_locked_at = null,
        draw_revealed_at = null,
        winning_number = null,
        draw_nonce = null,
        draw_order = null,
        updated_at = now()
    where id = v_id;
    delete from public.draw_secrets where campaign_id = v_id;
  end loop;
end $$;

-- Compatibilidade com versões antigas que tinham winning_number.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='draw_secrets' and column_name='winning_number'
  ) then
    alter table public.draw_secrets alter column winning_number drop not null;
  end if;
end $$;

create index if not exists idx_numbers_campaign on public.numbers(campaign_id);
create index if not exists idx_numbers_status on public.numbers(campaign_id, status);
create index if not exists idx_numbers_purchase on public.numbers(purchase_id);
create index if not exists idx_purchases_campaign on public.purchases(campaign_id);
create index if not exists idx_purchases_status on public.purchases(campaign_id, status);
create index if not exists idx_purchases_expiry on public.purchases(campaign_id, status, expires_at);
create index if not exists idx_purchase_numbers_purchase on public.purchase_numbers(purchase_id);

-- ----------------------------------------------------------------------------
-- Helper de autorização
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

-- ----------------------------------------------------------------------------
-- Proteção dos dados do compromisso criptográfico.
-- ----------------------------------------------------------------------------
create or replace function public.protect_draw_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.draw_locked_at is not null then
    if new.total_numbers is distinct from old.total_numbers
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
       or new.ticket_price is distinct from old.ticket_price
       or new.status is distinct from old.status then
      raise exception 'parâmetros críticos bloqueados após criação da prova';
    end if;
  end if;

  if coalesce(current_setting('app.draw_internal', true), '') <> '1' then
    if new.draw_commitment is distinct from old.draw_commitment
       or new.draw_locked_at is distinct from old.draw_locked_at
       or new.draw_revealed_at is distinct from old.draw_revealed_at
       or new.winning_number is distinct from old.winning_number
       or new.draw_nonce is distinct from old.draw_nonce
       or new.draw_order is distinct from old.draw_order then
      raise exception 'campos do sorteio só podem ser alterados pelas funções de integridade';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_draw_fields on public.campaigns;
create trigger trg_protect_draw_fields
before update on public.campaigns
for each row execute function public.protect_draw_fields();

create or replace function public.prevent_locked_campaign_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.draw_locked_at is not null then
    raise exception 'campanha com prova criptográfica não pode ser excluída pelo aplicativo';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_prevent_locked_campaign_delete on public.campaigns;
create trigger trg_prevent_locked_campaign_delete
before delete on public.campaigns
for each row execute function public.prevent_locked_campaign_delete();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.campaigns enable row level security;
alter table public.settings enable row level security;
alter table public.participants enable row level security;
alter table public.purchases enable row level security;
alter table public.numbers enable row level security;
alter table public.purchase_numbers enable row level security;
alter table public.admin_users enable row level security;
alter table public.draw_secrets enable row level security;

drop policy if exists "campaigns_public_read" on public.campaigns;
create policy "campaigns_public_read" on public.campaigns
  for select using (status = 'active' or public.is_admin());

drop policy if exists "campaigns_admin_write" on public.campaigns;
create policy "campaigns_admin_write" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "numbers_public_read" on public.numbers;
create policy "numbers_public_read" on public.numbers
  for select using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and (c.status = 'active' or public.is_admin())
    )
  );

-- Números: NENHUMA policy de escrita para authenticated. A partir desta versão,
-- toda mudança de status/purchase_id passa exclusivamente pelas funções
-- SECURITY DEFINER (create_purchase, admin_set_purchase_status,
-- release_expired_purchases), que rodam como dono da função e por isso não
-- dependem de policy de UPDATE aqui. Um UPDATE direto via Supabase JS/API por
-- um usuário authenticated falha por falta de policy — não existe "for update".
drop policy if exists "numbers_admin_write" on public.numbers;

-- Participantes: somente leitura direta (nome/whatsapp aparecem no painel).
-- Criação/edição só acontecem dentro de create_purchase/admin_update_purchase.
drop policy if exists "participants_admin_all" on public.participants;
drop policy if exists "participants_admin_read" on public.participants;
create policy "participants_admin_read" on public.participants
  for select using (public.is_admin());

-- Compras: somente leitura direta. Confirmar/cancelar/editar são só via RPC.
drop policy if exists "purchases_admin_all" on public.purchases;
drop policy if exists "purchases_admin_read" on public.purchases;
create policy "purchases_admin_read" on public.purchases
  for select using (public.is_admin());

-- Itens da compra: somente leitura direta (usado no join do painel).
drop policy if exists "purchase_numbers_admin_all" on public.purchase_numbers;
drop policy if exists "purchase_numbers_admin_read" on public.purchase_numbers;
create policy "purchase_numbers_admin_read" on public.purchase_numbers
  for select using (public.is_admin());

drop policy if exists "admin_users_self" on public.admin_users;
create policy "admin_users_self" on public.admin_users
  for select using (id = auth.uid());

revoke all on public.draw_secrets from anon, authenticated;

-- ----------------------------------------------------------------------------
-- GRANTS — hardening: authenticated nunca recebe INSERT/UPDATE/DELETE em
-- purchases, purchase_numbers, numbers ou participants. Essas tabelas controlam
-- elegibilidade da campanha/sorteio e só podem mudar via função SECURITY
-- DEFINER (que roda como dono da função, não como authenticated, e por isso
-- não é afetada por estes REVOKEs). "campaigns" e "settings" continuam com
-- escrita direta pelo painel — não fazem parte do escopo deste bloqueio, pois
-- não controlam elegibilidade de números/pagamento, e "campaigns" já tem seus
-- campos sensíveis do sorteio protegidos pelo trigger protect_draw_fields.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on public.numbers from authenticated, anon;
revoke insert, update, delete on public.purchases from authenticated, anon;
revoke insert, update, delete on public.purchase_numbers from authenticated, anon;
revoke insert, update, delete on public.participants from authenticated, anon;

grant select on public.campaigns, public.numbers to anon, authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant select, update on public.campaigns to authenticated;
grant select on public.participants, public.purchases, public.purchase_numbers to authenticated;
grant select on public.admin_users to authenticated;

-- ----------------------------------------------------------------------------
-- View pública ANTES da reserva: NUNCA inclui dados de Pix (chave, QR code,
-- instruções, nome do recebedor). Só o necessário para montar a página e
-- calcular o prazo de exibição: campaign_id, WhatsApp da loja (contato público,
-- não é segredo) e o prazo de reserva configurado.
--
-- IMPORTANTE: CREATE OR REPLACE VIEW não permite remover colunas de uma view
-- existente (o Postgres rejeita com "cannot drop columns from view"). Por isso
-- a view é derrubada e recriada do zero sempre que este script roda.
-- ----------------------------------------------------------------------------
drop view if exists public.public_settings;
create view public.public_settings as
  select
    campaign_id,
    whatsapp_number,
    reservation_hold_hours
  from public.settings;

grant select on public.public_settings to anon, authenticated;

-- ============================================================================
-- NÚMEROS E EXPIRAÇÃO DE RESERVAS
-- ============================================================================
create or replace function public.seed_campaign_numbers(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  select total_numbers into v_total from public.campaigns where id = p_campaign_id;
  if v_total is null then raise exception 'campanha não encontrada'; end if;

  insert into public.numbers (campaign_id, number, status)
  select p_campaign_id, gs, 'available'
  from generate_series(1, v_total) as gs
  on conflict (campaign_id, number) do nothing;
end;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC automaticamente toda vez que uma função
-- é criada (CREATE FUNCTION), a menos que isso seja revogado explicitamente.
-- Sem o REVOKE abaixo, "anon" herdaria EXECUTE por fazer parte de PUBLIC,
-- mesmo sem nenhum GRANT direto — é exatamente essa brecha que fechamos aqui.
-- A verificação interna (auth.uid() is null → permite; autenticado não-admin
-- → nega) continua igual, para que o script rodado pelo dono do banco no SQL
-- Editor (que ignora GRANTs, por ser superusuário) continue populando os
-- números do seed normalmente. O que muda é que a API pública (papel anon)
-- não consegue mais nem começar a chamar esta função.
revoke execute on function public.seed_campaign_numbers(uuid) from public, anon;
grant execute on function public.seed_campaign_numbers(uuid) to authenticated;

create or replace function public.release_expired_purchases(p_campaign_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int := 0;
begin
  with expired as (
    update public.purchases
    set status = 'expired', expired_at = now(), updated_at = now()
    where campaign_id = p_campaign_id
      and status = 'reserved'
      and (
        (expires_at is not null and expires_at <= now())
        or exists (
          select 1 from public.campaigns c
          where c.id = p_campaign_id
            and (now() at time zone 'America/Sao_Paulo')::date > c.end_date
        )
      )
    returning id
  ), released as (
    update public.numbers n
    set status = 'available', purchase_id = null, updated_at = now()
    where n.purchase_id in (select id from expired)
    returning n.id
  )
  select count(*) into v_count from released;

  return v_count;
end;
$$;

-- Público (release_expired_purchases faz parte do fluxo do comprador — a
-- página pública chama para liberar reservas vencidas antes de mostrar a
-- grade; mantida explicitamente acessível, com sua validação interna
-- intacta). O REVOKE de PUBLIC aqui é só para deixar explícito que o acesso
-- vem do GRANT seguinte, não do default implícito do Postgres. create_purchase
-- NÃO está mais nesta categoria — ver bloco mais abaixo.
revoke execute on function public.release_expired_purchases(uuid) from public;
grant execute on function public.release_expired_purchases(uuid) to anon, authenticated;

-- ============================================================================
-- SORTEIO VERIFICÁVEL
-- ============================================================================
-- Antes de qualquer reserva, o sistema cria uma ordem criptograficamente
-- aleatória com TODOS os números. Publica apenas SHA-256 da ordem + nonce.
-- Depois do encerramento, a ordem é revelada. Vence o primeiro número da ordem
-- que estiver CONFIRMADO. Assim um número não vendido não deixa o sorteio sem
-- vencedor quando existem outros números confirmados.
create or replace function public.lock_campaign_draw(p_campaign_id uuid)
returns table (commitment text, locked_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_order int[];
  v_nonce text;
  v_commitment text;
  v_locked_at timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if v_campaign.id is null then raise exception 'campanha não encontrada'; end if;

  if v_campaign.draw_commitment is not null then
    return query select v_campaign.draw_commitment, v_campaign.draw_locked_at;
    return;
  end if;

  if exists (
    select 1 from public.purchases
    where campaign_id = p_campaign_id and status in ('reserved','confirmed')
  ) then
    raise exception 'a prova deve ser criada antes da primeira reserva';
  end if;

  select array_agg(n order by random_key)
  into v_order
  from (
    select gs as n, encode(gen_random_bytes(16), 'hex') as random_key
    from generate_series(1, v_campaign.total_numbers) gs
  ) q;

  v_nonce := encode(gen_random_bytes(32), 'hex');
  v_commitment := encode(
    digest(
      p_campaign_id::text || '|' ||
      v_campaign.total_numbers::text || '|' ||
      v_campaign.end_date::text || '|' ||
      array_to_string(v_order, ',') || '|' ||
      v_nonce,
      'sha256'
    ),
    'hex'
  );
  v_locked_at := now();

  insert into public.draw_secrets (campaign_id, number_order, nonce)
  values (p_campaign_id, v_order, v_nonce)
  on conflict (campaign_id) do update
    set number_order = excluded.number_order,
        nonce = excluded.nonce,
        created_at = now();

  perform set_config('app.draw_internal', '1', true);
  update public.campaigns
  set draw_commitment = v_commitment,
      draw_locked_at = v_locked_at,
      draw_revealed_at = null,
      winning_number = null,
      draw_nonce = null,
      draw_order = null,
      updated_at = now()
  where id = p_campaign_id;

  return query select v_commitment, v_locked_at;
end;
$$;

create or replace function public.reveal_draw_if_due(p_campaign_id uuid)
returns table (
  commitment text,
  winning_number int,
  nonce text,
  number_order int[],
  revealed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_secret public.draw_secrets%rowtype;
  v_winner int;
  v_revealed_at timestamptz;
begin
  perform public.release_expired_purchases(p_campaign_id);

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if v_campaign.id is null or v_campaign.draw_commitment is null then return; end if;

  if (now() at time zone 'America/Sao_Paulo')::date <= v_campaign.end_date then return; end if;

  if v_campaign.draw_revealed_at is not null and v_campaign.draw_order is not null then
    return query select
      v_campaign.draw_commitment,
      v_campaign.winning_number,
      v_campaign.draw_nonce,
      v_campaign.draw_order,
      v_campaign.draw_revealed_at;
    return;
  end if;

  select * into v_secret
  from public.draw_secrets
  where campaign_id = p_campaign_id;

  if v_secret.campaign_id is null or v_secret.number_order is null then
    raise exception 'segredo da ordem do sorteio não encontrado';
  end if;

  select x.num into v_winner
  from unnest(v_secret.number_order) with ordinality as x(num, pos)
  join public.numbers n
    on n.campaign_id = p_campaign_id
   and n.number = x.num
   and n.status = 'confirmed'
  order by x.pos
  limit 1;

  v_revealed_at := now();
  perform set_config('app.draw_internal', '1', true);
  update public.campaigns
  set winning_number = v_winner,
      draw_nonce = v_secret.nonce,
      draw_order = v_secret.number_order,
      draw_revealed_at = v_revealed_at,
      updated_at = now()
  where id = p_campaign_id;

  return query select
    v_campaign.draw_commitment,
    v_winner,
    v_secret.nonce,
    v_secret.number_order,
    v_revealed_at;
end;
$$;

-- Administrativa: só o responsável autenticado pode sequer tentar chamar.
-- A verificação is_admin() dentro da função continua como está.
revoke execute on function public.lock_campaign_draw(uuid) from public, anon;
grant execute on function public.lock_campaign_draw(uuid) to authenticated;

-- Público (parte do fluxo do comprador; validações internas mantidas).
revoke execute on function public.reveal_draw_if_due(uuid) from public;
grant execute on function public.reveal_draw_if_due(uuid) to anon, authenticated;

-- ============================================================================
-- COMPRA / RESERVA
-- ============================================================================
-- O retorno desta função mudou (ganhou as colunas de Pix), e Postgres não
-- permite trocar o formato de retorno com CREATE OR REPLACE FUNCTION — por
-- isso a função é derrubada antes de recriada, preservando a mesma assinatura
-- de entrada (então nenhuma chamada existente no app quebra).
drop function if exists public.create_purchase(uuid, int[], text, text, text);

create function public.create_purchase(
  p_campaign_id uuid,
  p_numbers int[],
  p_name text,
  p_whatsapp text,
  p_payment_method text
)
returns table (
  purchase_id uuid,
  quantity int,
  total_amount numeric,
  expires_at timestamptz,
  pix_receiver_name text,
  pix_key text,
  pix_qr_code_url text,
  payment_instructions text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_hold_hours int;
  v_campaign_end_limit timestamptz;
  v_num int;
  v_number_id uuid;
  v_number_status text;
  v_number_ids uuid[] := '{}';
  v_participant_id uuid;
  v_purchase_id uuid;
  v_quantity int := 0;
  v_total numeric(10,2);
  v_expires_at timestamptz;
  v_phone text;
  v_pix_receiver_name text;
  v_pix_key text;
  v_pix_qr_code_url text;
  v_payment_instructions text;
begin
  if p_payment_method not in ('pix','dinheiro') then raise exception 'forma de pagamento inválida'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_whatsapp), '') = '' then
    raise exception 'nome e whatsapp são obrigatórios';
  end if;
  if p_numbers is null or cardinality(p_numbers) = 0 then raise exception 'escolha pelo menos um número'; end if;

  v_phone := regexp_replace(p_whatsapp, '[^0-9]', '', 'g');
  if length(v_phone) < 10 then raise exception 'whatsapp inválido'; end if;

  perform public.release_expired_purchases(p_campaign_id);

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for share;

  if v_campaign.id is null or v_campaign.status <> 'active' then raise exception 'campanha indisponível'; end if;
  if v_campaign.draw_commitment is null or v_campaign.draw_locked_at is null then
    raise exception 'prova do sorteio ainda não foi bloqueada';
  end if;
  if (now() at time zone 'America/Sao_Paulo')::date < v_campaign.start_date
     or (now() at time zone 'America/Sao_Paulo')::date > v_campaign.end_date then
    raise exception 'campanha fora do período de participação';
  end if;

  -- Alias "s." é obrigatório aqui: os nomes de saída da função (RETURNS TABLE)
  -- criam variáveis PL/pgSQL implícitas com o MESMO nome das colunas de
  -- settings (pix_receiver_name, pix_key, ...), então uma referência sem
  -- alias fica ambígua entre a variável e a coluna da tabela.
  select coalesce(s.reservation_hold_hours, 6), s.pix_receiver_name, s.pix_key, s.pix_qr_code_url, s.payment_instructions
  into v_hold_hours, v_pix_receiver_name, v_pix_key, v_pix_qr_code_url, v_payment_instructions
  from public.settings s where s.campaign_id = p_campaign_id;
  v_hold_hours := coalesce(v_hold_hours, 6);

  -- O prazo da reserva NUNCA pode passar do fim do último dia da campanha
  -- (23:59:59 em America/Sao_Paulo), porque admin_set_purchase_status já
  -- recusa confirmar/cancelar depois do encerramento. Sem este teto, a
  -- interface prometeria um prazo que o responsável não consegue cumprir.
  v_campaign_end_limit := (v_campaign.end_date::timestamp + interval '23:59:59') at time zone 'America/Sao_Paulo';
  v_expires_at := least(now() + make_interval(hours => v_hold_hours), v_campaign_end_limit);

  for v_num in select distinct x from unnest(p_numbers) as x order by x loop
    if v_num < 1 or v_num > v_campaign.total_numbers then raise exception 'número % inválido', v_num; end if;

    select id, status into v_number_id, v_number_status
    from public.numbers
    where campaign_id = p_campaign_id and number = v_num
    for update;

    if v_number_id is null then raise exception 'número % não encontrado', v_num; end if;
    if v_number_status <> 'available' then
      raise exception 'número % indisponível', v_num using errcode = '23505';
    end if;

    v_number_ids := array_append(v_number_ids, v_number_id);
    v_quantity := v_quantity + 1;
  end loop;

  -- O comprador nunca informa o valor. O servidor calcula preço x quantidade.
  v_total := v_quantity * v_campaign.ticket_price;

  -- Serializa compras simultâneas do mesmo WhatsApp sem depender de unicidade
  -- no cadastro legado.
  perform pg_advisory_xact_lock(hashtext(v_phone));

  select id into v_participant_id
  from public.participants
  where whatsapp_normalized = v_phone
  order by created_at asc
  limit 1
  for update;

  if v_participant_id is null then
    insert into public.participants (name, whatsapp, whatsapp_normalized)
    values (trim(p_name), trim(p_whatsapp), v_phone)
    returning id into v_participant_id;
  else
    update public.participants
    set name = trim(p_name), whatsapp = trim(p_whatsapp)
    where id = v_participant_id;
  end if;

  insert into public.purchases (
    campaign_id, participant_id, payment_method, status, total_amount, expires_at
  ) values (
    p_campaign_id, v_participant_id, p_payment_method, 'reserved', v_total, v_expires_at
  ) returning id into v_purchase_id;

  insert into public.purchase_numbers (purchase_id, number_id)
  select v_purchase_id, unnest(v_number_ids);

  update public.numbers
  set status = 'reserved', purchase_id = v_purchase_id, updated_at = now()
  where id = any(v_number_ids);

  -- Os dados do Pix só saem daqui — na resposta de uma reserva bem-sucedida.
  -- Se qualquer verificação acima falhar (número indisponível, sorteio não
  -- bloqueado, campanha fora do período), a função levanta exceção antes de
  -- chegar neste ponto e nenhum dado de Pix é retornado.
  return query select
    v_purchase_id, v_quantity, v_total, v_expires_at,
    v_pix_receiver_name, v_pix_key, v_pix_qr_code_url, v_payment_instructions;
end;
$$;

-- Público (fluxo do comprador; validações internas mantidas).
-- A partir desta versão, create_purchase só é chamável pelo backend com a
-- chave secreta (service_role) — nunca diretamente pela chave pública do
-- navegador. A proteção contra abuso (Cloudflare Turnstile) acontece na
-- Server Action, antes de chegar aqui; o banco garante que não existe outro
-- caminho de acesso a esta função além desse.
revoke execute on function public.create_purchase(uuid, int[], text, text, text) from public, anon, authenticated;
grant execute on function public.create_purchase(uuid, int[], text, text, text) to service_role;

-- Confirma ou cancela UMA compra inteira. Após o encerramento, não é permitido
-- mudar elegibilidade, evitando alterar quem participa do resultado revelado.
create or replace function public.admin_set_purchase_status(
  p_purchase_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_campaign_id uuid;
  v_end_date date;
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;
  if p_status not in ('confirmed','canceled') then raise exception 'status inválido'; end if;

  select campaign_id into v_campaign_id from public.purchases where id = p_purchase_id;
  if v_campaign_id is null then raise exception 'compra não encontrada'; end if;

  perform public.release_expired_purchases(v_campaign_id);

  select * into v_purchase
  from public.purchases
  where id = p_purchase_id
  for update;

  select end_date into v_end_date from public.campaigns where id = v_purchase.campaign_id;
  if (now() at time zone 'America/Sao_Paulo')::date > v_end_date then
    raise exception 'não é possível alterar pagamentos após o encerramento da campanha';
  end if;

  if v_purchase.status = 'expired' then
    raise exception 'esta reserva expirou e os números já foram liberados';
  end if;

  if p_status = 'confirmed' then
    if v_purchase.status in ('canceled','expired') then
      raise exception 'esta reserva não pode mais ser confirmada';
    end if;

    update public.purchases
    set status = 'confirmed',
        confirmed_at = coalesce(confirmed_at, now()),
        confirmed_by = auth.uid(),
        updated_at = now()
    where id = p_purchase_id;

    update public.numbers n
    set status = 'confirmed', purchase_id = p_purchase_id, updated_at = now()
    where n.id in (
      select pn.number_id from public.purchase_numbers pn where pn.purchase_id = p_purchase_id
    ) and n.purchase_id = p_purchase_id;
  else
    update public.purchases
    set status = 'canceled', updated_at = now()
    where id = p_purchase_id;

    update public.numbers
    set status = 'available', purchase_id = null, updated_at = now()
    where purchase_id = p_purchase_id;
  end if;
end;
$$;

-- Administrativa: só authenticated pode tentar; is_admin() decide por dentro.
revoke execute on function public.admin_set_purchase_status(uuid, text) from public, anon;
grant execute on function public.admin_set_purchase_status(uuid, text) to authenticated;

create or replace function public.admin_update_purchase(
  p_purchase_id uuid,
  p_participant_id uuid,
  p_name text,
  p_whatsapp text,
  p_payment_method text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_purchase public.purchases%rowtype;
  v_campaign_end date;
  v_phone text;
begin
  if not public.is_admin() then raise exception 'acesso negado'; end if;

  if p_payment_method not in ('pix','dinheiro') then
    raise exception 'forma de pagamento inválida';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'nome é obrigatório';
  end if;
  v_phone := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  if length(v_phone) < 10 then
    raise exception 'whatsapp inválido';
  end if;

  -- Trava a compra e confirma que ela existe antes de tocar em qualquer dado.
  select * into v_purchase
  from public.purchases
  where id = p_purchase_id
  for update;

  if v_purchase.id is null then
    raise exception 'compra não encontrada';
  end if;

  -- O comprador informado precisa ser o dono real desta compra — evita que
  -- uma chamada com o par purchase_id/participant_id errado altere o cadastro
  -- de uma pessoa que não tem nada a ver com a compra sendo editada.
  if v_purchase.participant_id is distinct from p_participant_id then
    raise exception 'este comprador não pertence a esta compra';
  end if;

  if v_purchase.status in ('expired', 'canceled') then
    raise exception 'não é possível editar uma reserva %', v_purchase.status;
  end if;

  select end_date into v_campaign_end
  from public.campaigns
  where id = v_purchase.campaign_id;

  if v_campaign_end is not null and (now() at time zone 'America/Sao_Paulo')::date > v_campaign_end then
    raise exception 'não é possível editar depois do encerramento da campanha';
  end if;

  update public.participants
  set name = trim(p_name), whatsapp = trim(p_whatsapp), whatsapp_normalized = v_phone
  where id = p_participant_id;

  update public.purchases
  set payment_method = p_payment_method,
      notes = coalesce(p_notes, ''),
      updated_at = now()
  where id = p_purchase_id;
end;
$$;

-- Administrativa: só authenticated pode tentar; is_admin() decide por dentro.
revoke execute on function public.admin_update_purchase(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_update_purchase(uuid, uuid, text, text, text, text) to authenticated;

-- ============================================================================
-- STORAGE — imagem do prêmio e QR Code Pix
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "campaign_assets_public_read" on storage.objects;
create policy "campaign_assets_public_read" on storage.objects
  for select using (bucket_id = 'campaign-assets');

drop policy if exists "campaign_assets_admin_insert" on storage.objects;
create policy "campaign_assets_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'campaign-assets' and public.is_admin());

drop policy if exists "campaign_assets_admin_update" on storage.objects;
create policy "campaign_assets_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'campaign-assets' and public.is_admin())
  with check (bucket_id = 'campaign-assets' and public.is_admin());

drop policy if exists "campaign_assets_admin_delete" on storage.objects;
create policy "campaign_assets_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'campaign-assets' and public.is_admin());

-- ============================================================================
-- SEED INICIAL
-- ============================================================================
do $$
declare
  v_campaign_id uuid;
begin
  if not exists (select 1 from public.campaigns) then
    insert into public.campaigns (
      title, description, start_date, end_date, total_numbers, ticket_price,
      status, regulation_text
    ) values (
      'Sorteio Especial',
      'Escolha um ou mais números e acompanhe a campanha pelo celular.',
      (now() at time zone 'America/Sao_Paulo')::date,
      '2026-10-10',
      200,
      10.00,
      'active',
      'Preencha aqui o regulamento e os dados de autorização aplicáveis à sua campanha.'
    ) returning id into v_campaign_id;

    insert into public.settings (campaign_id, reservation_hold_hours)
    values (v_campaign_id, 6);

    perform public.seed_campaign_numbers(v_campaign_id);
  end if;
end $$;

-- ============================================================================
-- PRIMEIRO E ÚNICO RESPONSÁVEL
-- ============================================================================
-- Supabase > Authentication > Users > Add user
-- Depois rode, trocando o UUID:
--
-- insert into public.admin_users (id, name, role)
-- values ('UUID_DO_USUARIO', 'Responsável', 'owner');
-- ============================================================================
