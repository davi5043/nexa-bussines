-- =====================================================================
-- NEXA BUSINESS - Configuração completa do banco (Supabase/PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode ser executado mais de uma vez (usa IF NOT EXISTS / DROP IF EXISTS).
-- =====================================================================

-- 0) TENANTS = a empresa que ASSINA o sistema (dona da conta).
--    Não confundir com COMPANIES (empresas clientes do CRM).
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 1) PROFILES = perfil de cada usuário do Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'colaborador' check (role in ('administrador','colaborador')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Funções auxiliares usadas pelas políticas de segurança (RLS)
create or replace function public.current_tenant_id() returns uuid
language sql stable security definer set search_path = public as
$$ select tenant_id from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'administrador' from public.profiles where id = auth.uid()), false) $$;

-- 2) COMPANIES = empresas clientes/parceiras
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  cnpj text,
  email text,
  phone text,
  address text,
  city text,
  state text check (state is null or char_length(state) = 2),
  contact_person text,
  notes text,
  created_at timestamptz not null default now()
);

-- 3) CLIENTS = clientes/contatos
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  document text,
  type text not null default 'pessoa_fisica' check (type in ('pessoa_fisica','pessoa_juridica')),
  city text,
  state text check (state is null or char_length(state) = 2),
  address text,
  notes text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  created_at timestamptz not null default now()
);

-- 4) OPPORTUNITIES = pipeline comercial
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  estimated_value numeric(14,2) not null default 0 check (estimated_value >= 0),
  opened_at date not null default current_date,
  expected_close_date date,
  stage text not null default 'novo_lead' check (stage in
    ('novo_lead','primeiro_contato','em_negociacao','proposta_enviada','em_aprovacao','ganho','perdido')),
  probability int not null default 10 check (probability between 0 and 100),
  description text,
  created_at timestamptz not null default now()
);

-- 5) SALES = vendas
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  sale_number bigint generated always as identity,
  client_id uuid references public.clients(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  amount numeric(14,2) not null check (amount >= 0),
  sale_date date not null default current_date,
  payment_method text check (payment_method in ('pix','boleto','cartao_credito','cartao_debito','transferencia','dinheiro')),
  status text not null default 'concluida' check (status in ('pendente','concluida','cancelada')),
  notes text,
  created_at timestamptz not null default now()
);

-- 6) TASKS = tarefas
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  due_date date,
  priority text not null default 'media' check (priority in ('baixa','media','alta','urgente')),
  status text not null default 'pendente' check (status in ('pendente','em_andamento','concluida','cancelada')),
  created_at timestamptz not null default now()
);

-- 7) ACTIVITIES = histórico (preenchido automaticamente pelos gatilhos abaixo)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id() references public.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  client_id uuid references public.clients(id) on delete cascade,
  description text not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Índices (consultas rápidas)
create index if not exists idx_clients_tenant on public.clients(tenant_id);
create index if not exists idx_companies_tenant on public.companies(tenant_id);
create index if not exists idx_opps_tenant_stage on public.opportunities(tenant_id, stage);
create index if not exists idx_sales_tenant_date on public.sales(tenant_id, sale_date);
create index if not exists idx_tasks_tenant_due on public.tasks(tenant_id, due_date);
create index if not exists idx_act_tenant_created on public.activities(tenant_id, created_at desc);

-- CADASTRO: ao criar usuário, cria a empresa-conta e o perfil administrador
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare new_tenant uuid;
begin
  insert into public.tenants(name)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Minha empresa'))
  returning id into new_tenant;
  insert into public.profiles(id, tenant_id, full_name, role)
  values (new.id, new_tenant, coalesce(new.raw_user_meta_data->>'full_name',''), 'administrador');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que colaborador se promova a administrador ou troque de empresa
create or replace function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if (new.role <> old.role or new.tenant_id <> old.tenant_id) and not public.is_admin() then
    raise exception 'Somente administradores podem alterar cargo ou empresa.';
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- HISTÓRICO AUTOMÁTICO (alimenta "atividades recentes")
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare msg text; cid uuid;
begin
  if tg_table_name = 'clients' then msg := 'Novo cliente cadastrado: ' || new.full_name; cid := new.id;
  elsif tg_table_name = 'opportunities' then msg := 'Nova oportunidade criada: ' || new.name; cid := new.client_id;
  elsif tg_table_name = 'sales' then msg := 'Venda registrada: nº ' || new.sale_number; cid := new.client_id;
  elsif tg_table_name = 'tasks' then msg := 'Nova tarefa: ' || new.title; cid := new.client_id;
  end if;
  insert into public.activities(tenant_id, entity_type, entity_id, client_id, description, created_by)
  values (new.tenant_id, tg_table_name, new.id, cid, msg, auth.uid());
  return new;
end $$;

drop trigger if exists log_clients on public.clients;
create trigger log_clients after insert on public.clients for each row execute function public.log_activity();
drop trigger if exists log_opps on public.opportunities;
create trigger log_opps after insert on public.opportunities for each row execute function public.log_activity();
drop trigger if exists log_sales on public.sales;
create trigger log_sales after insert on public.sales for each row execute function public.log_activity();
drop trigger if exists log_tasks on public.tasks;
create trigger log_tasks after insert on public.tasks for each row execute function public.log_activity();

-- =====================================================================
-- SEGURANÇA (RLS): cada usuário só enxerga dados da PRÓPRIA conta.
-- Com RLS ligado e sem política, ninguém acessa. As políticas abaixo
-- liberam apenas usuários logados cujo tenant_id bate com o do registro.
-- =====================================================================
alter table public.tenants       enable row level security;
alter table public.profiles      enable row level security;
alter table public.companies     enable row level security;
alter table public.clients       enable row level security;
alter table public.opportunities enable row level security;
alter table public.sales         enable row level security;
alter table public.tasks         enable row level security;
alter table public.activities    enable row level security;

drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated using (id = public.current_tenant_id());
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants for update to authenticated
  using (id = public.current_tenant_id() and public.is_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (tenant_id = public.current_tenant_id() and (id = auth.uid() or public.is_admin()))
  with check (tenant_id = public.current_tenant_id());

do $$
declare t text;
begin
  foreach t in array array['companies','clients','opportunities','sales','tasks','activities'] loop
    execute format('drop policy if exists %I on public.%I', t||'_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id())', t||'_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id())', t||'_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id())', t||'_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete', t);
    if t = 'tasks' then
      execute format('create policy %I on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id())', t||'_delete', t);
    else
      execute format('create policy %I on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id() and public.is_admin())', t||'_delete', t);
    end if;
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- =====================================================================
-- CONVITES: o administrador compartilha o "código de convite" da conta.
-- Quem se cadastrar informando o código entra como COLABORADOR na mesma conta.
-- =====================================================================
alter table public.tenants add column if not exists invite_code text unique
  default substr(md5(random()::text || clock_timestamp()::text), 1, 10);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare t uuid; code text := nullif(trim(coalesce(new.raw_user_meta_data->>'invite_code','')), '');
begin
  if code is not null then
    select id into t from public.tenants where invite_code = code;
    if t is null then raise exception 'Código de convite inválido.'; end if;
    insert into public.profiles(id, tenant_id, full_name, role)
    values (new.id, t, coalesce(new.raw_user_meta_data->>'full_name',''), 'colaborador');
  else
    insert into public.tenants(name) values (coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'Minha empresa'))
    returning id into t;
    insert into public.profiles(id, tenant_id, full_name, role)
    values (new.id, t, coalesce(new.raw_user_meta_data->>'full_name',''), 'administrador');
  end if;
  return new;
end $$;
