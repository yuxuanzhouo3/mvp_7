-- 收件人分组表
create table if not exists public.email_recipient_groups (
  id bigserial primary key,
  user_id uuid not null references public."user" (id) on delete cascade,
  name text not null,
  recipients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_email_recipient_groups_set_updated_at on public.email_recipient_groups;
create trigger trg_email_recipient_groups_set_updated_at
before update on public.email_recipient_groups
for each row
execute function public.set_updated_at();

create index if not exists idx_email_recipient_groups_user
  on public.email_recipient_groups (user_id, created_at desc);
