-- Saveline Realtime aktivieren.
-- In Supabase: SQL Editor -> New query -> Inhalt einfügen -> Run.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'rollen',
    'kunden',
    'historie',
    'qr_bemerkungen',
    'aktivitaet'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = table_name
       )
    THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END $$;
