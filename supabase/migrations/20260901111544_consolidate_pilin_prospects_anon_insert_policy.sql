drop policy if exists "pilin_prospects_public_insert" on public.pilin_prospects;
create policy "pilin_prospects_public_insert" on public.pilin_prospects for insert to anon with check (status = 'NEW' and length(trim(name)) between 2 and 120 and length(trim(whatsapp)) between 8 and 20);;
