-- Execute num projecto Supabase novo. Código de estudante = formato, não identidade verificada.
create table public.students (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(trim(full_name))>=3),
 student_code text not null unique check(student_code ~ '^01\.[0-9]{4}\.[0-9]{4}$'),
 created_at timestamptz not null default now()
);
create table public.connections (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references public.students(id) on delete cascade,
 addressee_id uuid not null references public.students(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester_id<>addressee_id)
);
create unique index connections_unique_pair on public.connections(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create table public.conversations (
 id uuid primary key default gen_random_uuid(),
 type text not null check(type in ('direct','group')),
 name text,
 created_by uuid not null references public.students(id),
 created_at timestamptz not null default now()
);
create table public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 role text not null default 'member' check(role in ('admin','member')),
 joined_at timestamptz not null default now(),
 primary key(conversation_id,student_id)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null references public.students(id),
 content text not null check(length(trim(content)) between 1 and 4000),
 created_at timestamptz not null default now()
);
create index messages_room_time on public.messages(conversation_id,created_at);
-- Registration trigger: validate and claim code atomically; do not expose privileged write access.
create or replace function public.on_user_created() returns trigger language plpgsql security definer set search_path='' as $$
declare n text; c text;
begin
 n:=trim(coalesce(new.raw_user_meta_data->>'full_name',''));
 c:=trim(coalesce(new.raw_user_meta_data->>'student_code',''));
 if length(n)<3 or c !~ '^01\.[0-9]{4}\.[0-9]{4}$' then raise exception 'Nome ou código de estudante inválido'; end if;
 insert into public.students(id,full_name,student_code) values(new.id,n,c);
 return new;
end $$;
-- Em projectos reutilizados, verifica se um trigger antigo chamado user_created
-- pertence à aplicação anterior antes de executar este script.
-- Não o eliminamos automaticamente para evitar quebrar outras aplicações.
create trigger link_user_created after insert on auth.users
for each row execute function public.on_user_created();
-- Helper functions run as definer to avoid recursive RLS checks.
create or replace function public.is_member(cid uuid, uid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.conversation_members where conversation_id=cid and student_id=uid)
$$;
create or replace function public.are_connected(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.connections where status='accepted' and ((requester_id=a and addressee_id=b) or (requester_id=b and addressee_id=a)))
$$;
revoke all on function public.is_member(uuid,uuid),public.are_connected(uuid,uuid) from public, anon;
grant execute on function public.is_member(uuid,uuid),public.are_connected(uuid,uuid) to authenticated;
-- RPCs own creation and enforce membership rules.
create or replace function public.create_direct_conversation(other_student uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); cid uuid;
begin
 if me is null or other_student=me or not public.are_connected(me,other_student) then raise exception 'Conexão aceite necessária'; end if;
 -- Serialize concurrent creations for this unordered pair.
 perform pg_advisory_xact_lock(hashtext(least(me::text,other_student::text)||':'||greatest(me::text,other_student::text)));
 select c.id into cid from public.conversations c join public.conversation_members m1 on m1.conversation_id=c.id and m1.student_id=me join public.conversation_members m2 on m2.conversation_id=c.id and m2.student_id=other_student where c.type='direct' limit 1;
 if cid is not null then return cid; end if;
 insert into public.conversations(type,created_by) values('direct',me) returning id into cid;
 insert into public.conversation_members(conversation_id,student_id) values(cid,me),(cid,other_student);
 return cid;
end $$;
create or replace function public.create_group_conversation(group_name text,member_ids uuid[]) returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); cid uuid; member uuid;
begin
 if me is null or length(trim(coalesce(group_name,''))) not between 3 and 80 or coalesce(array_length(member_ids,1),0) not between 1 and 49 then raise exception 'Nome ou membros inválidos'; end if;
 if exists(select 1 from unnest(member_ids) x where x=me or not public.are_connected(me,x)) then raise exception 'Só podes adicionar conexões aceites'; end if;
 insert into public.conversations(type,name,created_by) values('group',trim(group_name),me) returning id into cid;
 insert into public.conversation_members(conversation_id,student_id,role) values(cid,me,'admin');
 insert into public.conversation_members(conversation_id,student_id) select cid,x from (select distinct unnest(member_ids) x) t;
 return cid;
end $$;
revoke all on function public.create_direct_conversation(uuid),public.create_group_conversation(text,uuid[]) from public, anon;
grant execute on function public.create_direct_conversation(uuid),public.create_group_conversation(text,uuid[]) to authenticated;
-- RLS
alter table public.students enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
create policy students_read on public.students for select to authenticated using (true);
create policy connections_read on public.connections for select to authenticated using (auth.uid() in (requester_id,addressee_id));
create policy connections_request on public.connections for insert to authenticated with check(auth.uid()=requester_id and status='pending');
create policy connections_accept on public.connections for update to authenticated using(auth.uid()=addressee_id and status='pending') with check(auth.uid()=addressee_id and status='accepted');
create policy conversations_read on public.conversations for select to authenticated using(public.is_member(id,auth.uid()));
create policy members_read on public.conversation_members for select to authenticated using(public.is_member(conversation_id,auth.uid()));
create policy messages_read on public.messages for select to authenticated using(public.is_member(conversation_id,auth.uid()));
create policy messages_write on public.messages for insert to authenticated with check(sender_id=auth.uid() and public.is_member(conversation_id,auth.uid()));
-- Restrict UPDATE so the recipient cannot change participants or revert status.
create or replace function public.protect_connection_update() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.requester_id<>old.requester_id or new.addressee_id<>old.addressee_id or new.created_at<>old.created_at or old.status<>'pending' or new.status<>'accepted' then raise exception 'Actualização inválida'; end if;
 return new;
end $$;
create trigger link_protect_connection before update on public.connections for each row execute function public.protect_connection_update();
-- Enable live inserts for authenticated subscribers, respecting RLS.
do $$
begin
 if not exists (
   select 1 from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public' and tablename = 'messages'
 ) then
   alter publication supabase_realtime add table public.messages;
 end if;
end $$;
