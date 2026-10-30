-- Development only. Create at least one teacher and one student via Auth first.
-- Provision teacher role through SQL as an administrator, never signup metadata.
-- Transactional and idempotent: replaces only records with this seed's fixed UUIDs.
begin;
do $$
declare teacher uuid;student uuid;cid uuid;lid uuid;aid uuid;qid uuid;i int;j int;
begin
select id into teacher from public.profiles where role='teacher' order by created_at limit 1;
select id into student from public.profiles where role='student' order by created_at limit 1;
if teacher is null or student is null then raise exception 'Create development teacher and student profiles first';end if;
for i in 1..6 loop
cid:=('de000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
insert into courses(id,teacher_id,title,description,category,difficulty,duration,status) values(cid,teacher,'[DEMO] '||(array['Software architecture','Artificial intelligence','Data science','Interface design','Database systems','Academic English'])[i],'[DEMO] Development curriculum: concepts, examples, practice and assessment.','University','medium',30,'published') on conflict(id) do nothing;
insert into enrollments(user_id,course_id) values(student,cid) on conflict(user_id,course_id) do nothing;
for j in 1..5 loop
lid:=('de100000-0000-4000-8000-'||lpad((i*100+j)::text,12,'0'))::uuid;
insert into lessons(id,course_id,title,content,position) values(lid,cid,'[DEMO] Module '||j,'# Study module '||j||E'\n\nCompare concepts, reflect on applications, and solve a practice problem. This is labeled development material.',j) on conflict(id) do nothing;
if j<=2 then insert into lesson_completions(user_id,lesson_id) values(student,lid) on conflict(user_id,lesson_id) do nothing;end if;
end loop;
for j in 1..3 loop
aid:=('de200000-0000-4000-8000-'||lpad((i*100+j)::text,12,'0'))::uuid;
insert into assignments(id,course_id,title,description,deadline) values(aid,cid,'[DEMO] Practice '||j,'[DEMO] Explain a concept, provide an example and discuss limitations.',now()+make_interval(days=>i+j)) on conflict(id) do nothing;
end loop;
end loop;
for i in 1..30 loop
insert into calendar_events(id,user_id,title,start_at,end_at,description) values(('de300000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,student,'[DEMO] Study session '||i,now()+make_interval(days=>i),now()+make_interval(days=>i,hours=>1),'[DEMO] Development data') on conflict(id) do nothing;
end loop;
for i in 1..4 loop
qid:=('de400000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
insert into quizzes(id,user_id,course_id,title,difficulty) values(qid,student,'de000000-0000-4000-8000-000000000001','[DEMO] Architecture practice '||i,'easy') on conflict(id) do nothing;
for j in 0..4 loop
insert into quiz_questions(quiz_id,position,question,options,correct_answer,explanation) values(qid,j,'[DEMO] Which layer owns domain rules?','["Presentation","Business logic","Data access","Styles"]',1,'The service layer coordinates domain rules independently of presentation and persistence.') on conflict(quiz_id,position) do nothing;
end loop;
end loop;
end$$;
commit;
