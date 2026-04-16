-- 邮件发送日志表（持久化每次批量任务的每封邮件结果）
create table if not exists public.email_send_logs (
  id bigserial primary key,
  user_id uuid references public."user" (id) on delete set null,
  task_id text not null,                -- 批次唯一ID
  recipient_email text not null,
  recipient_name text,
  subject text,
  status text not null default 'pending',  -- pending / sent / failed
  error_message text,
  smtp_host text,
  message_id text,                       -- SMTP返回的 messageId
  tracking_id text,                      -- 追踪像素ID
  opened_at timestamptz,                 -- 首次打开时间
  open_count int not null default 0,     -- 打开次数
  created_at timestamptz not null default now()
);

create index if not exists idx_email_send_logs_user_task
  on public.email_send_logs (user_id, task_id);

create index if not exists idx_email_send_logs_user_created
  on public.email_send_logs (user_id, created_at desc);

create index if not exists idx_email_send_logs_tracking
  on public.email_send_logs (tracking_id)
  where tracking_id is not null;
