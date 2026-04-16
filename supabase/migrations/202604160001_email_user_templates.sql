-- 用户自定义邮件模板表
create table if not exists public.email_user_templates (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  name text not null,
  subject text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_user_templates_set_updated_at on public.email_user_templates;
create trigger trg_email_user_templates_set_updated_at
before update on public.email_user_templates
for each row
execute function public.set_updated_at();

create index if not exists idx_email_user_templates_user
  on public.email_user_templates (user_id, created_at desc);
