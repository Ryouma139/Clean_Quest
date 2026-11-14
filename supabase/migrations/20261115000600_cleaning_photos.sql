-- ミッションの「掃除前」「掃除後」の写真
--   保存先: Storage の非公開バケット cleaning-photos、パスは「<ユーザーID>/<ファイル名>」
--   記録  : cleaning_logs.before_photo_path / after_photo_path

-- ---------------------------------------------------------------------
-- Storage バケット（非公開・5MBまで・JPEG/PNG/WebP のみ）
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cleaning-photos', 'cleaning-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 自分のフォルダ（先頭がユーザーID）の中だけ、閲覧・追加・削除できる
create policy "cleaning photos: select own" on storage.objects for select to authenticated
  using (bucket_id = 'cleaning-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cleaning photos: insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'cleaning-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cleaning photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'cleaning-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 掃除記録に写真のパスを持たせる
-- ---------------------------------------------------------------------
alter table public.cleaning_logs
  add column before_photo_path text,
  add column after_photo_path  text;

comment on column public.cleaning_logs.before_photo_path is '掃除前の写真（Storage: cleaning-photos 内のパス）';
comment on column public.cleaning_logs.after_photo_path  is '掃除後の写真（Storage: cleaning-photos 内のパス）';

-- ---------------------------------------------------------------------
-- complete_mission に写真のパスを渡せるようにする（引数が変わるので作り直す）
-- ---------------------------------------------------------------------
drop function public.complete_mission(text);

create function public.complete_mission(
  p_mission_id        text,
  p_before_photo_path text default null,
  p_after_photo_path  text default null
) returns public.cleaning_logs
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_mission public.missions;
  v_task_id uuid;
  v_log     public.cleaning_logs;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- 写真は自分のフォルダのものだけ受け付ける
  if (p_before_photo_path is not null and p_before_photo_path not like v_uid::text || '/%')
     or (p_after_photo_path is not null and p_after_photo_path not like v_uid::text || '/%') then
    raise exception 'invalid photo path';
  end if;

  select * into v_mission from missions where id = p_mission_id and is_active;
  if not found then raise exception 'mission not found'; end if;

  if exists (select 1 from cleaning_logs
              where user_id = v_uid and mission_id = p_mission_id
                and (completed_at at time zone 'Asia/Tokyo')::date = tokyo_today()) then
    raise exception 'mission already completed today';
  end if;

  select id into v_task_id from cleaning_tasks
   where user_id = v_uid and template_key = v_mission.task_template_key and archived_at is null
   limit 1;

  insert into cleaning_logs (user_id, task_id, mission_id, name, points, before_photo_path, after_photo_path)
  values (v_uid, v_task_id, v_mission.id, replace(replace(v_mission.name, '！', ''), '!', ''), v_mission.points,
          p_before_photo_path, p_after_photo_path)
  returning * into v_log;
  return v_log;
end $$;

revoke execute on function public.complete_mission(text, text, text) from public, anon;
grant execute on function public.complete_mission(text, text, text) to authenticated;
