-- El registro de un dependiente vinculaba solo nombre + alergias, sin
-- documento de identidad — pedido explícito de la usuaria: cada dependiente
-- debe estar asociado a su propio número de DNI (o el que corresponda),
-- igual que la cuenta principal del titular.

alter table public.dependents add column if not exists dni text;

notify pgrst, 'reload schema';
