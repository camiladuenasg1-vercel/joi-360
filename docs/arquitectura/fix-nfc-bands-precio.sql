-- Precio unitario por bandita NFC: se fija por lote al cargarlo (o por fila
-- si el Excel trae su propia columna de precio), queda grabado en cada
-- código individual para que la asignación a un mundo pueda discriminar el
-- costo real, incluso si el mismo nombre de lote se recarga después con un
-- precio distinto.

alter table public.nfc_bands add column if not exists precio_unitario numeric;

notify pgrst, 'reload schema';
