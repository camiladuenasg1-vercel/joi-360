-- Task #128: login "Soy Mundo" del POS — necesita su propia clave, igual que
-- merchants.pos_pin para "Soy Comercio". El código corto ya existe
-- (worlds.code, ej. ED-LIM-006); esto solo agrega la clave.

alter table public.worlds add column if not exists pos_pin text;

notify pgrst, 'reload schema';
