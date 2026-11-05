-- HAIDER: تأمين جدول mods في Supabase
-- راجع الملف كله قبل التشغيل. لم أختبره على مشروعك. خذ نسخة احتياطية أولًا.
-- 1) استبدل ADMIN_USER_UUID بمعرّف حساب الأدمن (Authentication > Users > User UID)
-- 2) شغّله في SQL Editor.

alter table public.mods enable row level security;

-- الزوار: قراءة العناصر المنشورة فقط
drop policy if exists "public read published" on public.mods;
create policy "public read published" on public.mods
  for select to anon, authenticated
  using (published = true);

-- الأدمن فقط: قراءة وإضافة وتعديل وحذف
drop policy if exists "admin full access" on public.mods;
create policy "admin full access" on public.mods
  for all to authenticated
  using (auth.uid() = 'ADMIN_USER_UUID'::uuid)
  with check (auth.uid() = 'ADMIN_USER_UUID'::uuid);

-- تحقق بعد التشغيل (يجب أن تظهر السياستان فقط):
-- select policyname, cmd, roles from pg_policies where tablename = 'mods';

-- يدويًا من لوحة Supabase:
--  * Authentication > Sign In / Providers: عطّل "Allow new users to sign up"
--  * فعّل MFA لحساب الأدمن
--  * increment_mod_download: لم أرَ تعريفها. تأكد أنها تزيد العدّاد بمقدار 1 فقط لعنصر منشور،
--    ولاحظ أن حارس sessionStorage في المتصفح فقط ولا يمنع التضخيم المتعمد.
