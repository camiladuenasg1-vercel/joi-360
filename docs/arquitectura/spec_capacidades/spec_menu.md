# SPEC Funcional — Menú

*Documento de especificación funcional, no un registro de iteraciones. Formato de referencia: `spec_eventos.md`.*

Fuente: código real (`joi360-admin/src/Fronts.jsx` → `MenuCatalogoPanel`; `joi360-app/src/pages/Module.jsx` → `MenuTemplate`), leído línea por línea el mismo día de este documento.

---

## 1. Propósito y alcance

`menu` (tier OPCIONAL) es el catálogo diario de menú con cupos, restricciones alimentarias y pre-orden/reserva — el caso de uso original es un colegio (Caso Raimondi) donde el padre/usuario programa el menú de su hijo y el concesionario (comercio) valida y entrega, pero el diseño es deliberadamente genérico: cualquier mundo con un caso de "menú/turno recurrente por día" puede reusarlo.

**Depende de:** `inventario` (`DEPENDENCY_MAP`) — conceptualmente, aunque en la práctica Menú tiene sus propias tablas (`menu_items`, no `products`).

---

## 2. Componentes

### 2.1 Catálogo del comercio (autoría)
**Dónde:** `MenuCatalogoPanel` (`Fronts.jsx:460`). Distinto de "Mi catálogo" (`products`, vitrina de compra puntual, ver `spec_comercios.md`) — un plato de Menú tiene **alérgenos** y se **programa por día de la semana** con recurrencia.

Alérgenos disponibles (checklist, `ALERGENOS_MENU`): Gluten, Lactosa, Mariscos, Nueces, Huevo, Soya, Frutos rojos, Maní. Programación semanal por plato (`DIAS_SEMANA`: Lun-Dom) con cupos máximos opcionales por día (`guardarProgramacionItem` — reemplaza toda la programación de un plato en un solo paso, borra+inserta, no diffea día por día).

### 2.2 Calendario y reserva (lado usuario)
**Dónde:** `MenuTemplate` (`Module.jsx:1839`). Strip calendar horizontal (`diasStripDe`, respeta `diasAnticipacion` del mundo, 1-14 días) — el menú visible por día se trae vía `fetchMenuDelDia(worldId, diaSemana)`, filtrado además por comercio.

**Selector de beneficiario OBLIGATORIO si hay dependientes** — a diferencia de Marketplace/Wallet, que auto-seleccionan el titular por default, Menú exige elegir explícitamente para quién es la reserva si el usuario tiene dependientes registrados (decisión de producto explícita, para no reservar/cobrar al perfil equivocado por accidente). Las alergias consideradas son las del **beneficiario elegido** — del titular vienen de su propio Perfil Extendido, de un dependiente de `dependents.alergias`.

**Bloqueo por alergia** (`bloqueadoPorAlergia`): un plato cuyo `alergenos` intersecta con las alergias registradas del beneficiario queda inactivable en el carrito — bloqueo duro, no solo un aviso.

**Bloqueo por restricción individual** (`dependent_restrictions.productos_bloqueados`) — independiente del bloqueo por alergia.

**Carrito de un solo comercio a la vez**, igual que Marketplace — cambiar de comercio dispara aviso, no error duro. El carrito es **por día**: cambiar de fecha vacía la selección (excepto al restaurar un borrador guardado en `sessionStorage` para ESE mismo día — sobrevive salir sin querer de la pantalla).

### 2.3 Checkout y límite diario
`crearReservaMenu` (RPC): valida y aplica el `limiteDiarioPerfil` — el límite propio del dependiente en `dependent_restrictions.limite_diario` manda sobre el default del mundo (`configFields.limiteDiarioPerfil`). Si el monto ya reservado ese día + el nuevo total excede el límite, rechaza con `motivo:"limite_excedido"` y un mensaje que declara explícitamente que "se avisó al padre/superusuario". Revalidación server-side de horario/restricciones (`restriccion_horario`/`restriccion_limite_diario`) por si la config cambió a mitad de sesión, mismo patrón que Marketplace.

### 2.4 Método de reserva — gap documentado, no simulado
`configFields.metodoReserva` (saldo|qr|ambos): **el canje QR en punto de venta NO tiene flujo de canje real construido.** Antes esta configuración no tenía ningún efecto (el checkout siempre cobraba saldo sin importar lo elegido) — corregido para que, en modo `qr` o `ambos`, la app avise honestamente que el canje en POS aún no está disponible, en vez de simular un cobro. **Mismo gap señalado en `spec_eventos.md` §3.5 para la precompra de evento — es un gap COMPARTIDO entre las dos capacidades, no exclusivo de Menú.**

### 2.5 Entrega en el comercio
`marcarMenuReservaEntregadaRemote` — el cobro ya ocurrió en la app (`crearReservaMenu → mover_saldo_wallet`); esto es la acción del operador/POS que cierra el círculo marcando la reserva ya pagada como `ENTREGADA` (mismo patrón que la validación de entrada de Eventos: algo pagado se consume/confirma, nunca se vuelve a cobrar).

### 2.6 Membresía (histórico, `menu_membresias`)
Tabla existente para membresía de Menú por familiar (suscripción opcional a Menú por dependiente) — el mecanismo actual de "cobro por vincular familiar" vive realmente en `control` (Restricciones), reusando `subscription_plans` solo como catálogo de montos (ver `spec_control.md`/`spec_suscripciones.md`); no confundir los dos.

---

## 3. Config fields (`MODULE_CATALOG.menu`)

| Campo | Tipo | Default |
|---|---|---|
| `diasAnticipacion` | number | 7 |
| `cuposPorMenu` | number | 100 |
| `metodoReserva` | select (saldo\|qr\|ambos) | saldo |

---

## 4. Modelo de datos

```
menu_items
  id, world_id, merchant_id, nombre, descripcion, precio,
  categoria, alergenos (array), imagen_url, created_at

menu_programacion
  id, world_id, merchant_id, menu_item_id, dia_semana (0-6, Date.getDay()),
  cupos_max (nullable)

menu_reservas
  id, world_id, merchant_id, beneficiario_user_id, beneficiario_nombre,
  fecha, items (jsonb), monto, estado (CONFIRMADA|ENTREGADA), entregado_at, created_at

menu_membresias
  id, world_id, guardian_user_id, beneficiario_user_id,
  beneficiario_nombre, activo, created_at

consumo_alertas (compartida con control)
  ver spec_control.md
```

---

## 5. Matriz de componentes por frente

| Frente | Componente | Rol |
|---|---|---|
| **BackOffice Comercio** | `MenuCatalogoPanel` | Autoría: platos, alérgenos, programación semanal |
| **BackOffice Comercio / POS** | Marcar entrega de `menu_reservas` | Cierre del círculo de una reserva ya pagada |
| **App Usuario** | `Module.jsx` → `MenuTemplate` | Calendario, reserva, checkout, "Mis reservas" |

---

## 6. Reglas de negocio críticas

1. Selección de beneficiario es obligatoria (no auto-seleccionada) apenas hay más de un beneficiario posible.
2. Bloqueo por alergia es duro — no se puede agregar al carrito un plato con alérgeno presente en el beneficiario elegido.
3. El límite diario del dependiente (individual) siempre gana sobre el default del mundo.
4. El canje por QR en POS no está construido — nunca simular ese cobro, avisar honestamente.
5. Cobro y confirmación de entrega son 2 pasos separados — la reserva puede estar `CONFIRMADA` (pagada) sin estar `ENTREGADA` todavía.
6. El carrito es por comercio Y por día — cambiar cualquiera de los dos reinicia la selección (salvo restauración de borrador del mismo día).

---

## 7. Estado y versionado

Capacidad `menu` — **v1.0.0**, `tier: OPCIONAL`, depende de `inventario`. Construida y verificada en producción, salvo el canje QR en POS (§2.4, gap compartido con Eventos, documentado explícitamente en la propia UI).

## 8. Referencias

- `spec_comercios.md` — patrón de checkout con beneficiario y validación doble capa, reusado acá.
- `spec_eventos.md` §3.5 — mismo gap de canje QR no construido.
- `spec_control.md` — de dónde vienen `dependent_restrictions`/alergias de dependientes.
