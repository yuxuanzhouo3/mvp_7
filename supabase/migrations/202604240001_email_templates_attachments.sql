-- 为邮件模板添加附件存储字段
-- 使用 JSONB 数组存储每个附件的元信息 + base64 内容
-- 格式: [{ "filename": "...", "contentType": "...", "size": 1234, "base64": "..." }, ...]
alter table public.email_user_templates
  add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column public.email_user_templates.attachments is
  'Template attachments stored as JSON array of { filename, contentType, size, base64 }';
