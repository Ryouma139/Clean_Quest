-- 新規登録フォームのニックネーム（user_metadata.display_name）をプロフィールに反映する
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 30), ''), 'そうじねこ')
  );
  insert into public.cleaning_tasks (user_id, template_key, name, area, freq, points, emoji, sort_order)
    select new.id, template_key, name, area, freq, points, emoji, sort_order from public.default_tasks;
  return new;
end $$;
