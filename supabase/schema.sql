create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text unique not null,
  city text,
  state text,
  family_members integer,
  room_count integer,
  house_type text,
  monthly_budget_goal numeric,
  onboarding_completed_at timestamptz,
  onboarding_skipped_at timestamptz
);

alter table public.users enable row level security;

drop policy if exists "Users can view their profile" on public.users;
drop policy if exists "Users can insert their profile" on public.users;
drop policy if exists "Users can update their profile" on public.users;

grant select, insert, update on public.users to authenticated;
grant select, insert, update on public.users to service_role;

create policy "Users can view their profile"
on public.users for select
using (auth.uid() = id);

create policy "Users can insert their profile"
on public.users for insert
with check (auth.uid() = id);

create policy "Users can update their profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users add column if not exists state text;
alter table public.users add column if not exists monthly_budget_goal numeric;
alter table public.users add column if not exists onboarding_completed_at timestamptz;
alter table public.users add column if not exists onboarding_skipped_at timestamptz;

create table if not exists public.appliances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  appliance_name text not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.appliances add column if not exists created_at timestamptz default now();

alter table public.appliances enable row level security;

drop policy if exists "Users can manage their appliances" on public.appliances;

grant select, insert, update, delete on public.appliances to authenticated;
grant select, insert, update, delete on public.appliances to service_role;

create policy "Users can manage their appliances"
on public.appliances for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bill_month text not null,
  units_consumed numeric,
  bill_amount numeric,
  billing_days integer,
  season text,
  uploaded_file_url text,
  ocr_raw_text text,
  parsed_data jsonb,
  corrected_data jsonb,
  parsed_field_meta jsonb,
  manual_override_fields text[] default '{}',
  ocr_confidence numeric,
  verification_status text not null default 'needs_review',
  parser_version text,
  seasonal_metadata jsonb,
  seasonal_behavior_insights jsonb,
  seasonal_assumptions jsonb,
  estimated_contribution_results jsonb,
  estimated_appliance_contributions jsonb,
  estimation_metadata jsonb,
  behavioral_assumptions jsonb,
  estimation_generated_at timestamptz,
  recommendation_results jsonb,
  recommendation_metadata jsonb,
  recommendation_generated_at timestamptz,
  prediction_results jsonb,
  prediction_metadata jsonb,
  prediction_generated_at timestamptz,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  meter_reading numeric,
  subsidy numeric,
  tariff_details text,
  average_month_units numeric,
  recorded_md numeric,
  energy_charges numeric,
  fixed_charges numeric,
  electricity_duty numeric,
  interest_on_ed numeric,
  surcharge numeric,
  adjustment numeric,
  interest_on_cd numeric,
  loss_gain numeric,
  gjs_subsidy numeric,
  net_bill_amount numeric
);

alter table public.bills add column if not exists ocr_raw_text text;
alter table public.bills add column if not exists parsed_data jsonb;
alter table public.bills add column if not exists corrected_data jsonb;
alter table public.bills add column if not exists parsed_field_meta jsonb;
alter table public.bills add column if not exists manual_override_fields text[] default '{}';
alter table public.bills add column if not exists ocr_confidence numeric;
alter table public.bills add column if not exists verification_status text default 'needs_review';
alter table public.bills add column if not exists parser_version text;
alter table public.bills add column if not exists season text;
alter table public.bills add column if not exists seasonal_metadata jsonb;
alter table public.bills add column if not exists seasonal_behavior_insights jsonb;
alter table public.bills add column if not exists seasonal_assumptions jsonb;
alter table public.bills add column if not exists estimated_contribution_results jsonb;
alter table public.bills add column if not exists estimated_appliance_contributions jsonb;
alter table public.bills add column if not exists estimation_metadata jsonb;
alter table public.bills add column if not exists behavioral_assumptions jsonb;
alter table public.bills add column if not exists estimation_generated_at timestamptz;
alter table public.bills add column if not exists recommendation_results jsonb;
alter table public.bills add column if not exists recommendation_metadata jsonb;
alter table public.bills add column if not exists recommendation_generated_at timestamptz;
alter table public.bills add column if not exists prediction_results jsonb;
alter table public.bills add column if not exists prediction_metadata jsonb;
alter table public.bills add column if not exists prediction_generated_at timestamptz;
alter table public.bills add column if not exists is_deleted boolean default false;
alter table public.bills add column if not exists deleted_at timestamptz;
alter table public.bills add column if not exists updated_at timestamptz default now();
alter table public.bills add column if not exists created_at timestamptz default now();
alter table public.bills add column if not exists meter_reading numeric;
alter table public.bills add column if not exists subsidy numeric;
alter table public.bills add column if not exists tariff_details text;
alter table public.bills add column if not exists average_month_units numeric;
alter table public.bills add column if not exists recorded_md numeric;
alter table public.bills add column if not exists energy_charges numeric;
alter table public.bills add column if not exists fixed_charges numeric;
alter table public.bills add column if not exists electricity_duty numeric;
alter table public.bills add column if not exists interest_on_ed numeric;
alter table public.bills add column if not exists surcharge numeric;
alter table public.bills add column if not exists adjustment numeric;
alter table public.bills add column if not exists interest_on_cd numeric;
alter table public.bills add column if not exists loss_gain numeric;
alter table public.bills add column if not exists gjs_subsidy numeric;
alter table public.bills add column if not exists net_bill_amount numeric;

create index if not exists bills_user_created_at_idx on public.bills (user_id, created_at desc);
create index if not exists bills_verification_status_idx on public.bills (verification_status);
create index if not exists bills_user_is_deleted_idx on public.bills (user_id, is_deleted);

alter table public.bills enable row level security;

drop policy if exists "Users can manage their bills" on public.bills;

grant select, insert, update, delete on public.bills to authenticated;
grant select, insert, update, delete on public.bills to service_role;

create policy "Users can manage their bills"
on public.bills for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question text not null,
  answer text not null,
  assistant_category text,
  generated_insights jsonb,
  related_recommendation_refs jsonb,
  grounding_metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.assistant_conversations add column if not exists generated_insights jsonb;
alter table public.assistant_conversations add column if not exists related_recommendation_refs jsonb;
alter table public.assistant_conversations add column if not exists grounding_metadata jsonb;
alter table public.assistant_conversations add column if not exists created_at timestamptz default now();

create index if not exists assistant_conversations_user_created_at_idx on public.assistant_conversations (user_id, created_at desc);

alter table public.assistant_conversations enable row level security;

drop policy if exists "Users can manage their assistant conversations" on public.assistant_conversations;

grant select, insert, update, delete on public.assistant_conversations to authenticated;
grant select, insert, update, delete on public.assistant_conversations to service_role;

create policy "Users can manage their assistant conversations"
on public.assistant_conversations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
