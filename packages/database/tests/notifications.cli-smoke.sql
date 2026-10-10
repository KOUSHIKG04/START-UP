-- Disposable project only: all fixture writes roll back.
BEGIN;
DO $$
DECLARE
  own_auth uuid := gen_random_uuid(); other_auth uuid := gen_random_uuid();
  own_identity uuid; other_identity uuid; event_id uuid; own_intent uuid; other_intent uuid;
  listed jsonb; important_intent uuid; emergency_intent uuid; emergency_event uuid; denied boolean;
BEGIN
  INSERT INTO auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
    VALUES (own_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      '+91'||(floor(random()*8000000000)::bigint+1000000000)::text,now()),
      (other_auth,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
      '+91'||(floor(random()*8000000000)::bigint+1000000000)::text,now());
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES ('supabase',own_auth::text,'Notification Owner') RETURNING id INTO own_identity;
  INSERT INTO clinzo.identity(issuer,subject,display_name)
    VALUES ('supabase',other_auth::text,'Other Recipient') RETURNING id INTO other_identity;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
    VALUES ('test.notification','identity',own_identity,1,gen_random_uuid(),'{}') RETURNING id INTO event_id;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES (own_identity,event_id,'test.own',gen_random_uuid()::text,'{}',now()+interval '1 day') RETURNING id INTO own_intent;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES (other_identity,event_id,'test.other',gen_random_uuid()::text,'{}',now()+interval '1 day') RETURNING id INTO other_intent;

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub',own_auth::text,true);
  SELECT public.list_my_notifications() INTO listed;
  IF jsonb_array_length(listed)<>1 OR (listed->0->>'id')::uuid<>own_intent OR
    (listed->0->>'is_read')::boolean THEN RAISE EXCEPTION 'Notification scope/read state failed'; END IF;
  IF public.mark_my_notifications_read(ARRAY[other_intent])<>0 THEN
    RAISE EXCEPTION 'Other recipient notification was marked'; END IF;
  IF public.mark_my_notifications_read(ARRAY[own_intent])<>1 THEN
    RAISE EXCEPTION 'Own notification was not marked'; END IF;
  SELECT public.list_my_notifications() INTO listed;
  IF NOT (listed->0->>'is_read')::boolean THEN RAISE EXCEPTION 'Read state missing'; END IF;
  EXECUTE 'RESET ROLE';
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES(own_identity,event_id,'appointment.check_in',gen_random_uuid()::text,'{}',now()+interval '1 day') RETURNING id INTO important_intent;
  INSERT INTO clinzo.domain_event(event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload)
    VALUES('sos.requested','identity',own_identity,2,gen_random_uuid(),'{}') RETURNING id INTO emergency_event;
  INSERT INTO clinzo.notification_intent(recipient_id,event_id,template_key,dedup_key,safe_parameters,expires_at)
    VALUES(own_identity,emergency_event,'ambulance.update',gen_random_uuid()::text,'{}',now()+interval '1 day') RETURNING id INTO emergency_intent;
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT public.list_my_notifications() INTO listed;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(listed) n WHERE n->>'id'=important_intent::text AND (n->>'is_important')::boolean AND NOT (n->>'is_emergency')::boolean)
    THEN RAISE EXCEPTION 'Important check-in classification failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(listed) n WHERE n->>'id'=emergency_intent::text AND (n->>'is_emergency')::boolean)
    THEN RAISE EXCEPTION 'SOS event classification failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(listed) n WHERE n->>'id'=own_intent::text AND NOT (n->>'is_important')::boolean AND NOT (n->>'is_emergency')::boolean)
    THEN RAISE EXCEPTION 'Ordinary notification classification failed'; END IF;
  denied:=false;
  BEGIN PERFORM public.dismiss_my_notification(other_intent); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Other recipient notification was deleted'; END IF;
  PERFORM public.dismiss_my_notification(own_intent);
  PERFORM public.dismiss_my_notification(own_intent);
  PERFORM public.mark_my_notifications_read();
  SELECT public.list_my_notifications() INTO listed;
  IF jsonb_array_length(listed)<>2 OR EXISTS(SELECT 1 FROM jsonb_array_elements(listed) n WHERE n->>'id'=own_intent::text)
    THEN RAISE EXCEPTION 'Dismissed notification returned after refresh/mark-read'; END IF;
  PERFORM set_config('request.jwt.claim.sub',other_auth::text,true);
  IF jsonb_array_length(public.list_my_notifications())<>1 THEN RAISE EXCEPTION 'Dismissal changed another inbox'; END IF;
  EXECUTE 'RESET ROLE';
  IF NOT EXISTS(SELECT 1 FROM clinzo.notification_intent WHERE id=own_intent)
    THEN RAISE EXCEPTION 'Inbox deletion removed delivery history'; END IF;
  IF has_function_privilege('anon','public.dismiss_my_notification(uuid)','EXECUTE')
    THEN RAISE EXCEPTION 'Anonymous role can delete notifications'; END IF;
END $$;
ROLLBACK;
SELECT true AS notification_smoke_passed;
