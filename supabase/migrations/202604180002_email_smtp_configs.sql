-- 用户保存的 SMTP 配置表
create table if not exists public.email_smtp_configs (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  name text not null,
  host text not null,
  port text not null default '465',
  username text not null,
  pass text not null,
  sender_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_smtp_configs_set_updated_at on public.email_smtp_configs;
create trigger trg_email_smtp_configs_set_updated_at
before update on public.email_smtp_configs
for each row
execute function public.set_updated_at();

create index if not exists idx_email_smtp_configs_user
  on public.email_smtp_configs (user_id, created_at desc);
