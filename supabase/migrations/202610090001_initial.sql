-- All application tables are outside the exposed API schema. RLS denies direct
-- access; only the explicitly granted, identity-checking functions are callable.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;
alter default privileges in schema private revoke execute on functions from public, anon, authenticated;

create table private.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  future_opt_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index profiles_name on private.profiles(lower(display_name), id);
create index profiles_name_search on private.profiles(lower(display_name) text_pattern_ops);
create table private.club_memberships (
  user_id uuid primary key references private.profiles(id),
  status text not null default 'pending' check (status in ('pending','approved','removed'))
);
create index memberships_status on private.club_memberships(status,user_id);
create table private.administrators (user_id uuid primary key references private.profiles(id));
create table private.invitations (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);
create table private.monthly_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 100),
  status text not null default 'open' check (status in ('open','closed','active','completed','archived')),
  reveal_at timestamptz not null,
  revealed_at timestamptz,
  version bigint not null default 0,
  created_at timestamptz not null default now()
);
-- Only one unfinished round. Completed rounds remain accessible in history.
create unique index one_current_event on private.monthly_events((true)) where status in ('open','closed','active');
create index event_history on private.monthly_events(created_at desc,id);
create table private.event_participants (
  event_id uuid references private.monthly_events(id),
  user_id uuid references private.profiles(id),
  withdrawn boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
create index participant_history on private.event_participants(user_id,event_id);
create table private.assignments (
  event_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  primary key(event_id,sender_id),
  unique(event_id,recipient_id),
  check(sender_id<>recipient_id),
  foreign key(event_id,sender_id) references private.event_participants(event_id,user_id),
  foreign key(event_id,recipient_id) references private.event_participants(event_id,user_id)
);
create table private.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key(event_id,sender_id) references private.assignments(event_id,sender_id),
  foreign key(event_id,recipient_id) references private.event_participants(event_id,user_id)
);
create index message_inbox on private.messages(recipient_id,event_id,created_at desc,id);
create index message_rate on private.messages(sender_id,created_at desc);
create table private.missions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private.monthly_events(id),
  title text not null check(length(trim(title)) between 1 and 120),
  description text not null check(length(description)<=1000),
  created_at timestamptz not null default now()
);
create index mission_event on private.missions(event_id,created_at,id);
create table private.mission_completions (
  mission_id uuid references private.missions(id),
  user_id uuid references private.profiles(id),
  primary key(mission_id,user_id)
);
create table private.reveal_guesses (
  event_id uuid not null,
  user_id uuid not null,
  guessed_user_id uuid not null,
  primary key(event_id,user_id),
  check(user_id<>guessed_user_id),
  foreign key(event_id,user_id) references private.event_participants(event_id,user_id),
  foreign key(event_id,guessed_user_id) references private.event_participants(event_id,user_id)
);
create table private.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references private.messages(id),
  reporter_id uuid not null references private.profiles(id),
  reason text not null check(length(trim(reason)) between 1 and 1000),
  status text not null default 'open' check(status in ('open','resolved')),
  created_at timestamptz not null default now(),
  unique(message_id,reporter_id)
);
create index report_queue on private.reports(status,created_at desc,id);
create table private.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private.monthly_events(id),
  title text not null check(length(trim(title)) between 1 and 120),
  body text not null check(length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index announcement_event on private.announcements(event_id,created_at desc,id);
create table private.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null,
  event_id uuid,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['profiles','club_memberships','administrators','invitations','monthly_events','event_participants','assignments','messages','missions','mission_completions','reveal_guesses','reports','announcements','audit_log'] loop
    execute format('alter table private.%I enable row level security',t);
    execute format('revoke all on private.%I from public, anon, authenticated',t);
  end loop;
end $$;

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from private.administrators a join private.club_memberships m on m.user_id=a.user_id where a.user_id=auth.uid() and m.status='approved');
$$;
create function private.require_member() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from private.club_memberships where user_id=auth.uid() and status='approved') then
    raise exception 'Approved club membership is required.' using errcode='42501';
  end if;
  return auth.uid();
end $$;
create function private.require_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Administrator access is required.' using errcode='42501'; end if;
end $$;

-- Registration is enforced even when clients bypass the Next.js form.
-- Metadata can never assign privileges. The invitation is consumed atomically.
create function private.register_invited_user() returns trigger language plpgsql security definer set search_path='' as $$
declare v_hash text; v_name text;
begin
  v_hash:=encode(sha256(convert_to(coalesce(new.raw_user_meta_data->>'invitation_code',''),'UTF8')),'hex');
  update private.invitations set used_at=now()
    where token_hash=v_hash and lower(email)=lower(new.email) and used_at is null and expires_at>now();
  if not found then raise exception 'A valid invitation for this email is required.'; end if;
  v_name:=trim(coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into private.profiles(id,display_name) values(new.id,v_name);
  insert into private.club_memberships(user_id) values(new.id);
  return new;
end $$;
create trigger on_invited_user_created after insert on auth.users for each row execute function private.register_invited_user();

create function public.app_read(p_section text default 'dashboard', p_args jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  u uuid:=auth.uid(); e private.monthly_events; result jsonb; items jsonb; total bigint;
  pg integer:=greatest(1,coalesce((p_args->>'page')::integer,1));
  q text:=replace(replace(replace(lower(left(trim(coalesce(p_args->>'q','')),100)),E'\\',E'\\\\'),'%','\%'),'_','\_');
  ad boolean:=private.is_admin();
begin
  if u is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  select jsonb_build_object('profile',jsonb_build_object('id',p.id,'display_name',p.display_name,'future_opt_out',p.future_opt_out,'status',m.status),'is_admin',ad)
    into result from private.profiles p join private.club_memberships m on m.user_id=p.id where p.id=u;
  if result is null then raise exception 'Your club profile is unavailable.'; end if;
  if p_section='profile' then return result; end if;
  perform private.require_member();
  if p_section like 'admin-%' then perform private.require_admin(); end if;
  if p_args->>'event' is not null then
    select * into e from private.monthly_events where id=(p_args->>'event')::uuid;
    if not ad and not exists(select 1 from private.event_participants where event_id=e.id and user_id=u) then
      raise exception 'This round is not available.' using errcode='42501';
    end if;
  else
    select * into e from private.monthly_events order by (status in ('open','closed','active')) desc,created_at desc,id limit 1;
  end if;
  result:=result||jsonb_build_object('event',case when e.id is null then null else to_jsonb(e)-'version' end,'participation',
    (select jsonb_build_object('withdrawn',withdrawn) from private.event_participants where event_id=e.id and user_id=u));
  if p_section='history' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select ev.id,ev.title,ev.status,ev.reveal_at from private.monthly_events ev
      where exists(select 1 from private.event_participants p where p.event_id=ev.id and p.user_id=u)
      order by ev.created_at desc,ev.id limit 21 offset ((pg::bigint-1)*20)
    ) x;
    return result||jsonb_build_object('items',items);
  end if;
  if p_section in ('dashboard','friend','send','reveal') then
    result:=result||jsonb_build_object('friend',(
      select jsonb_build_object('display_name',p.display_name,'withdrawn',ep.withdrawn)
      from private.assignments a join private.profiles p on p.id=a.recipient_id
      join private.event_participants ep on ep.event_id=a.event_id and ep.user_id=a.recipient_id
      where a.event_id=e.id and a.sender_id=u
    ));
  end if;
  if p_section in ('dashboard','missions','admin-missions') then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select m.id,m.title,m.description,exists(select 1 from private.mission_completions c where c.mission_id=m.id and c.user_id=u) as completed
      from private.missions m where m.event_id=e.id order by m.created_at,m.id
      limit 21 offset (case when p_section='dashboard' then 0 else (pg::bigint-1)*20 end)
    ) x;
    result:=result||jsonb_build_object('missions',items);
  end if;
  if p_section in ('dashboard','admin-announcements') then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select id,title,body,created_at from private.announcements where event_id=e.id order by created_at desc,id
      limit 21 offset (case when p_section='dashboard' then 0 else (pg::bigint-1)*20 end)
    ) x;
    result:=result||jsonb_build_object('announcements',items);
  end if;
  if p_section in ('dashboard','inbox') then
    -- Deliberately project only safe fields: no sender, recipient or relationship IDs.
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select m.id,m.body,m.created_at,exists(select 1 from private.reports r where r.message_id=m.id and r.reporter_id=u) as reported
      from private.messages m where m.event_id=e.id and m.recipient_id=u order by m.created_at desc,m.id
      limit 21 offset (case when p_section='dashboard' then 0 else (pg::bigint-1)*20 end)
    ) x;
    result:=result||jsonb_build_object('messages',items);
  end if;
  if p_section='reveal' then
    result:=result||jsonb_build_object('guess',(
      select p.display_name from private.reveal_guesses g join private.profiles p on p.id=g.guessed_user_id where g.event_id=e.id and g.user_id=u
    ));
    if e.status in ('completed','archived') then
      result:=result||jsonb_build_object('sender',(
        select jsonb_build_object('display_name',p.display_name,'correct',
          (select guessed_user_id=a.sender_id from private.reveal_guesses where event_id=e.id and user_id=u))
        from private.assignments a join private.profiles p on p.id=a.sender_id where a.event_id=e.id and a.recipient_id=u
      ));
    elsif e.status='active' and q<>'' and exists(select 1 from private.event_participants where event_id=e.id and user_id=u and not withdrawn) then
      select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
        select p.id,p.display_name from private.event_participants ep join private.profiles p on p.id=ep.user_id
        where ep.event_id=e.id and p.id<>u and lower(p.display_name) like q||'%'
        order by lower(p.display_name),p.id limit 21 offset ((pg::bigint-1)*20)
      ) x;
      result:=result||jsonb_build_object('candidates',items);
    end if;
  end if;
  if p_section='admin-participants' then
    select count(*) into total from private.profiles p join private.club_memberships m on m.user_id=p.id
      where lower(p.display_name) like q||'%' and (coalesce(p_args->>'status','')='' or m.status=p_args->>'status');
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select p.id,p.display_name,p.created_at,m.status,p.future_opt_out,
        exists(select 1 from private.event_participants ep where ep.event_id=e.id and ep.user_id=p.id) as joined,
        coalesce((select ep.withdrawn from private.event_participants ep where ep.event_id=e.id and ep.user_id=p.id),false) as withdrawn
      from private.profiles p join private.club_memberships m on m.user_id=p.id
      where lower(p.display_name) like q||'%' and (coalesce(p_args->>'status','')='' or m.status=p_args->>'status')
      order by case when p_args->>'sort'='newest' then p.created_at end desc,
        case when p_args->>'sort'='name-desc' then lower(p.display_name) end desc, lower(p.display_name),p.id
      limit 20 offset ((pg::bigint-1)*20)
    ) x;
    result:=result||jsonb_build_object('items',items,'total',total);
  elsif p_section='admin-events' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select id,title,status,reveal_at from private.monthly_events order by created_at desc,id limit 21 offset ((pg::bigint-1)*20)
    ) x;
    result:=result||jsonb_build_object('items',items);
  elsif p_section='admin-reports' then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into items from (
      select r.id,r.reason,r.status,r.created_at,m.body from private.reports r join private.messages m on m.id=r.message_id
      where r.status=coalesce(nullif(p_args->>'status',''),'open') order by r.created_at desc,r.id limit 21 offset ((pg::bigint-1)*20)
    ) x;
    result:=result||jsonb_build_object('items',items);
  end if;
  if p_section in ('admin-overview','admin-assignments') then
    result:=result||jsonb_build_object('stats',jsonb_build_object(
      'members',(select count(*) from private.club_memberships where status='approved'),
      'pending',(select count(*) from private.club_memberships where status='pending'),
      'participants',(select count(*) from private.event_participants where event_id=e.id and not withdrawn),
      'assignments',(select count(*) from private.assignments where event_id=e.id),
      'withdrawn',(select count(*) from private.event_participants where event_id=e.id and withdrawn),
      'reports',(select count(*) from private.reports where status='open')
    ));
  end if;
  return result;
end $$;

create function public.app_write(p_action text, p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); e private.monthly_events; eid uuid:=(p_args->>'event')::uuid;
  rid uuid; target uuid; msg text; n bigint; obj uuid;
begin
  if u is null then raise exception 'Sign in to continue.' using errcode='42501'; end if;
  if p_action='profile' then
    update private.profiles set display_name=trim(p_args->>'display_name'),future_opt_out=coalesce((p_args->>'future_opt_out')::boolean,false) where id=u;
    return '{}';
  end if;
  perform private.require_member();
  if p_action like 'admin-%' then perform private.require_admin(); end if;
  -- Every roster/lifecycle writer takes the same lock as the commit operation.
  if eid is not null then
    if p_action in ('join','leave','admin-event','admin-date','admin-withdraw') then
      select * into e from private.monthly_events where id=eid for update;
    else
      select * into e from private.monthly_events where id=eid for share;
    end if;
  end if;
  perform private.require_member();
  case p_action
  when 'join' then
    if e.id is null or e.status<>'open' then raise exception 'Registration is not open.'; end if;
    if exists(select 1 from private.profiles where id=u and future_opt_out) then raise exception 'Enable participation in Settings before joining.'; end if;
    insert into private.event_participants(event_id,user_id) values(e.id,u) on conflict do nothing;
    update private.monthly_events set version=version+1 where id=e.id;
  when 'leave' then
    if e.status<>'open' or e.id is null then raise exception 'Contact an organizer to withdraw after registration closes.'; end if;
    delete from private.event_participants where event_id=e.id and user_id=u;
    update private.monthly_events set version=version+1 where id=e.id;
  when 'send' then
    if e.status<>'active' or e.id is null then raise exception 'Messages are available during an active round.'; end if;
    select a.recipient_id into rid from private.assignments a
      join private.event_participants s on s.event_id=a.event_id and s.user_id=a.sender_id
      join private.event_participants r on r.event_id=a.event_id and r.user_id=a.recipient_id
      where a.event_id=e.id and a.sender_id=u and not s.withdrawn and not r.withdrawn;
    if rid is null then raise exception 'This relationship is paused or unavailable.' using errcode='42501'; end if;
    -- Serialize this sender's checks, including simultaneous requests.
    perform pg_advisory_xact_lock(hashtextextended(u::text,0));
    select count(*) into n from private.messages where sender_id=u and created_at>now()-interval '1 hour';
    if n>=10 or exists(select 1 from private.messages where sender_id=u and created_at>now()-interval '15 seconds') then
      raise exception 'Please slow down. Allow 15 seconds between notes and at most 10 per hour.';
    end if;
    insert into private.messages(event_id,sender_id,recipient_id,body) values(e.id,u,rid,trim(p_args->>'body'));
  when 'report' then
    obj:=(p_args->>'id')::uuid;
    if not exists(select 1 from private.messages where id=obj and recipient_id=u) then raise exception 'Message unavailable.' using errcode='42501'; end if;
    insert into private.reports(message_id,reporter_id,reason) values(obj,u,trim(p_args->>'reason')) on conflict do nothing;
  when 'complete-mission' then
    obj:=(p_args->>'id')::uuid;
    if e.status<>'active' or e.id is null or not exists(select 1 from private.missions where id=obj and event_id=e.id)
      or not exists(select 1 from private.event_participants where event_id=e.id and user_id=u and not withdrawn) then
      raise exception 'Mission unavailable.' using errcode='42501';
    end if;
    if (p_args->>'completed')::boolean then
      insert into private.mission_completions values(obj,u) on conflict do nothing;
    else delete from private.mission_completions where mission_id=obj and user_id=u; end if;
  when 'guess' then
    target:=(p_args->>'user_id')::uuid;
    if e.status<>'active' or e.id is null or now()>=e.reveal_at or not exists(select 1 from private.event_participants where event_id=e.id and user_id=u and not withdrawn) then
      raise exception 'Guessing is closed.';
    end if;
    insert into private.reveal_guesses(event_id,user_id,guessed_user_id) values(e.id,u,target);
  when 'admin-invite' then
    if length(p_args->>'token_hash')<>64 or length(p_args->>'email')>254 or position('@' in p_args->>'email')<2 then raise exception 'Invalid invitation.'; end if;
    insert into private.invitations(token_hash,email,expires_at) values(p_args->>'token_hash',lower(trim(p_args->>'email')),now()+interval '7 days');
  when 'admin-member' then
    target:=(p_args->>'user_id')::uuid;
    if target=u or exists(select 1 from private.administrators where user_id=target) then raise exception 'Administrator membership must be managed by the database owner.'; end if;
    if p_args->>'status' not in ('approved','removed') then raise exception 'Invalid membership status.'; end if;
    -- Lock all unfinished rounds before altering eligibility or marking withdrawal.
    perform 1 from private.monthly_events where status in ('open','closed','active') order by id for update;
    update private.club_memberships set status=p_args->>'status' where user_id=target;
    if p_args->>'status'='removed' then
      delete from private.event_participants ep using private.monthly_events ev where ep.event_id=ev.id and ep.user_id=target and ev.status in ('open','closed');
      update private.event_participants ep set withdrawn=true from private.monthly_events ev where ep.event_id=ev.id and ep.user_id=target and ev.status='active';
      update private.monthly_events set version=version+1 where status in ('open','closed');
    end if;
  when 'admin-create-event' then
    if (p_args->>'reveal_at')::timestamptz<=now() then raise exception 'Choose a future reveal date.'; end if;
    insert into private.monthly_events(title,reveal_at) values(trim(p_args->>'title'),(p_args->>'reveal_at')::timestamptz) returning id into eid;
  when 'admin-event' then
    if e.id is null then raise exception 'Round unavailable.'; end if;
    msg:=p_args->>'status';
    if not ((e.status='open' and msg='closed') or (e.status='closed' and msg='open') or
      (e.status='active' and msg='completed') or (e.status='completed' and msg='archived')) then raise exception 'Invalid round transition.'; end if;
    update private.monthly_events set status=msg,revealed_at=case when msg='completed' then now() else revealed_at end,version=version+1 where id=e.id;
  when 'admin-date' then
    if e.status not in ('open','closed','active') or e.id is null or (p_args->>'reveal_at')::timestamptz<=now() then raise exception 'Choose a future reveal date for an unfinished round.'; end if;
    update private.monthly_events set reveal_at=(p_args->>'reveal_at')::timestamptz where id=e.id;
  when 'admin-withdraw' then
    if e.status<>'active' or e.id is null then raise exception 'Only active rounds use safe withdrawal.'; end if;
    update private.event_participants set withdrawn=true where event_id=e.id and user_id=(p_args->>'user_id')::uuid;
  when 'admin-mission' then
    if e.status not in ('open','closed','active') or e.id is null then raise exception 'This round is read-only.'; end if;
    if nullif(p_args->>'id','') is null then
      insert into private.missions(event_id,title,description) values(e.id,trim(p_args->>'title'),coalesce(p_args->>'description',''));
    else
      update private.missions set title=trim(p_args->>'title'),description=coalesce(p_args->>'description','') where id=(p_args->>'id')::uuid and event_id=e.id;
    end if;
  when 'admin-announcement' then
    if e.id is null then raise exception 'Choose a round first.'; end if;
    insert into private.announcements(event_id,title,body) values(e.id,trim(p_args->>'title'),trim(p_args->>'body'));
  when 'admin-resolve' then
    update private.reports set status='resolved' where id=(p_args->>'id')::uuid;
  else raise exception 'Unknown action.';
  end case;
  if p_action like 'admin-%' then insert into private.audit_log(actor_id,action,event_id) values(u,p_action,eid); end if;
  return jsonb_build_object('event',eid);
end $$;

create function public.assignment_context(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare e private.monthly_events; prior uuid;
begin
  perform private.require_admin();
  select * into e from private.monthly_events where id=p_event;
  if e.status<>'closed' or e.id is null then raise exception 'Close registration before generating assignments.'; end if;
  select id into prior from private.monthly_events where status in ('completed','archived') and created_at<e.created_at order by created_at desc,id limit 1;
  -- JSON aggregates are not silently truncated by PostgREST's row limit.
  return jsonb_build_object('version',e.version,
    'participants',(select coalesce(jsonb_agg(user_id order by user_id),'[]') from private.event_participants where event_id=e.id and not withdrawn),
    'previous',(select coalesce(jsonb_agg(jsonb_build_object('sender_id',sender_id,'recipient_id',recipient_id)),'[]') from private.assignments where event_id=prior));
end $$;

create function public.commit_assignments(p_event uuid,p_version bigint,p_edges jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare e private.monthly_events; expected bigint; actual bigint; visited bigint; first_id uuid;
begin
  perform private.require_admin();
  select * into e from private.monthly_events where id=p_event for update;
  if e.id is null or e.status<>'closed' or e.version<>p_version then raise exception 'Round changed or assignments already generated. Refresh and try again.'; end if;
  select count(*),min(user_id::text)::uuid into expected,first_id from private.event_participants where event_id=e.id and not withdrawn;
  if expected<2 then raise exception 'At least two confirmed participants are required.'; end if;
  if jsonb_typeof(p_edges)<>'array' or jsonb_array_length(p_edges)<>expected then raise exception 'Assignment count does not match participants.'; end if;
  insert into private.assignments(event_id,sender_id,recipient_id)
    select e.id,x.sender_id,x.recipient_id from jsonb_to_recordset(p_edges) as x(sender_id uuid,recipient_id uuid);
  -- Unique/FK/check constraints validate bijection, membership and no self-pairs.
  if exists(select 1 from private.assignments a join private.event_participants p on p.event_id=a.event_id and p.user_id=a.sender_id where a.event_id=e.id and p.withdrawn) then
    raise exception 'Withdrawn participants cannot be assigned.';
  end if;
  with recursive walk(id) as (
    select first_id union
    select a.recipient_id from private.assignments a join walk w on a.sender_id=w.id where a.event_id=e.id
  ) select count(*) into visited from walk;
  if visited<>expected then raise exception 'Assignments must form one complete cycle.'; end if;
  select count(*) into actual from private.assignments where event_id=e.id;
  if actual<>expected then raise exception 'Incomplete assignments.'; end if;
  update private.monthly_events set status='active',version=version+1 where id=e.id;
  insert into private.audit_log(actor_id,action,event_id) values(auth.uid(),'generate-assignments',e.id);
end $$;

revoke all on function public.app_read(text,jsonb) from public,anon;
revoke all on function public.app_write(text,jsonb) from public,anon;
revoke all on function public.assignment_context(uuid) from public,anon;
revoke all on function public.commit_assignments(uuid,bigint,jsonb) from public,anon;
grant execute on function public.app_read(text,jsonb),public.app_write(text,jsonb),public.assignment_context(uuid),public.commit_assignments(uuid,bigint,jsonb) to authenticated;
-- Never add private tables to the Realtime publication.
