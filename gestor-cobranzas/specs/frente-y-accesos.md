# Gestor de Cobranzas — Frente independiente y accesos

**Este documento corrige y reemplaza** las secciones 2, 3, 6 y 7 de `design.md`, y los
requerimientos REQ-COB-001 a 003 de `requirements.md`.

La primera versión del spec ubicó el gestor como una sección **dentro** de Admin RP. Eso es
incorrecto. El gestor es un **frente independiente**, un software aparte que se activa desde el
catálogo, se contrata por mundo o por comercio, y se entrega al cliente con **sus propias
credenciales de Cognito**. Red Pontis no opera la cobranza del cliente: la habilita y le entrega
la llave.

---

## 1. Qué cambia respecto de la primera versión

| Tema | Primera versión (incorrecta) | Esta versión |
|---|---|---|
| Ubicación | Sección dentro de Admin RP | Cuarto frente, al nivel de admin / mundo / comercio |
| Acceso | El operador de Red Pontis entra por Admin RP | El cliente entra con su usuario de Cognito a su propio portal |
| Alcance | Solo por comercio | Por **mundo o por comercio**, discriminadamente |
| Rol de Admin RP | Contiene el panel | **Activa la capacidad y entrega las credenciales**. No contiene el panel |
| Navegación | Tab dentro del detalle de comercio | Portal propio con su URL, su login y su shell |

Lo que **no** cambia: el modelo de datos (`design.md` §8), los contratos de dominio (§9), la carga
masiva (§10), el motor de prorateo (§14) y todos los requerimientos del 010 al 093. Esos siguen
vigentes tal como están escritos. Lo único que cambia es **dónde vive el panel y quién entra**.

---

## 2. Los cuatro frentes

Hoy el monolito sirve tres frentes desde `app-source/client/`, cada uno con su entrada de Vite
(`client/vite.config.js`, `rollupOptions.input`):

| Frente | Entrada | Ruta | Quién entra |
|---|---|---|---|
| Shell | `index.html` | `/joi360app/` | cualquiera; elige a qué portal entrar |
| Admin RP | `admin.html` | `/joi360app/admin` | Red Pontis |
| Portal del Mundo | `mundo.html` | `/joi360app/mundo/:code` | el sponsor |
| Portal del Comercio | `comercio.html` | `/joi360app/comercio/:slug` | el comercio |

El gestor de cobranzas es el cuarto:

| Frente | Entrada | Ruta | Quién entra |
|---|---|---|---|
| **Gestor de Cobranzas** | **`cobranzas.html`** | **`/joi360app/cobranzas/:scope/:code`** | **el titular del producto contratado** |

Donde `:scope` es `mundo` o `comercio` y `:code` es el `world.code` o el `merchant.portal_slug`.

Ejemplos reales del caso YOKI:

```
/joi360app/cobranzas/comercio/yoki          YOKI gestiona su propia cartera
/joi360app/cobranzas/mundo/JOCKEY-01        Jockey Plaza gestiona la cobranza de todo el mundo
```

Los dos pueden coexistir: un mundo puede tener el producto para sí y además habilitárselo a uno de
sus comercios. Cada uno ve **solo su cartera**.

### Cambios concretos de build

```js
// app-source/client/vite.config.js
input: {
  shell:     resolve(clientDir, 'index.html'),
  admin:     resolve(clientDir, 'admin.html'),
  mundo:     resolve(clientDir, 'mundo.html'),
  comercio:  resolve(clientDir, 'comercio.html'),
  cobranzas: resolve(clientDir, 'cobranzas.html'),
}
```

Más `client/cobranzas.html` y `client/src/cobranzas/`. El frente **no importa nada** de
`client/src/admin/`: si comparte algo, ese algo se mueve antes a un lugar común.

---

## 3. El catálogo manda: capacidad con alcance

La capacidad nace en `server/modules/capabilities/catalog.js`, como cualquier otra. Lo nuevo es que
necesita declarar **alcance**, porque hoy todas las capacidades se activan por mundo y esta se activa
por mundo o por comercio.

```js
{
  code: 'cobranzas',
  mobileCode: null,
  name: 'Gestor de Cobranzas',
  tier: 'PREMIUM',
  category: 'Emisión',
  iconKey: 'request_quote',
  description: 'Software de cobranza recurrente con su propio panel. Se contrata por mundo o por comercio y se entrega con credenciales propias.',
  devStatus: 'planned',
  comingSoon: true,
  appVisible: false,
  scope: ['WORLD', 'MERCHANT'],
  ownFront: { entry: 'cobranzas', route: '/joi360app/cobranzas' },
  sortOrder: 24,
  dependsOn: [],
  configFields: [ /* ver design.md §8, collection_rule */ ],
  services: [
    { code: 'planes',      name: 'Planes de suscripción',  surface: 'cobranzas' },
    { code: 'cartera',     name: 'Carga de cartera',       surface: 'cobranzas' },
    { code: 'morosidad',   name: 'Gestión de morosidad',   surface: 'cobranzas' },
    { code: 'prorateo',    name: 'Prorateo por cambio de plan', surface: 'cobranzas' },
    { code: 'avisos',      name: 'Avisos y recordatorios', surface: 'cobranzas' },
    { code: 'pago_link',   name: 'Link de pago y QR',      surface: 'publico' },
  ],
}
```

Dos campos nuevos en el catálogo:

- **`scope`** — arreglo con `'WORLD'`, `'MERCHANT'` o ambos. Las capacidades existentes se declaran
  `['WORLD']` y su comportamiento no cambia.
- **`ownFront`** — presente solo en las capacidades que traen portal propio. Le dice al admin que al
  activarla hay que entregar credenciales, y le dice al shell que hay una caja más que ofrecer.

`surface: 'cobranzas'` es una superficie nueva en el vocabulario de superficies
(`app | pos | comercio | mundo | admin`), que pasa a incluir `cobranzas` y `publico`.

---

## 4. Activación discriminada

### Por mundo

En `/admin/mundos/:id` → tab **Capacidades**, junto a las demás. Al activarla:

- se escribe en `world_module` como cualquier capacidad;
- aparece la tarjeta de **entrega de credenciales** del portal de cobranzas.

### Por comercio

En `/admin/mundos/:id` → tab **Actores** → fila del comercio. Al activarla:

- se escribe en `merchant_module` (la tabla nueva de `design.md` §7, Opción A);
- aparece la misma tarjeta de entrega, con alcance comercio.

**Son independientes.** Activarla en el mundo no la activa en sus comercios, y activarla en un
comercio no requiere que el mundo la tenga. Esto es distinto de cómo funcionan las capacidades hoy,
y es deliberado: el producto se vende por separado a cada uno.

### Regla de alcance

Una capacidad solo se puede activar en el nivel que su `scope` declara. Intentar activar por comercio
una capacidad con `scope: ['WORLD']` responde `capability_scope_not_allowed`.

---

## 5. Credenciales propias en Cognito

### Grupos nuevos

Siguiendo el patrón exacto de `server/auth/access.js`, que ya resuelve el nivel por el sufijo del
grupo (`manager|admin → ADMIN`, `operator → OPERADOR`, `support → SOPORTE`, `readonly → LECTURA`):

```js
const GRUPOS_COBRANZAS = lista(
  process.env.COGNITO_GROUP_COLLECTIONS,
  'collections-admin,collections-operator,collections-readonly'
);
```

| Grupo | Nivel | Puede |
|---|---|---|
| `collections-admin` | ADMIN | todo: planes, reglas, cartera, prorateo, anulaciones, exportar |
| `collections-operator` | OPERADOR | cargar cartera, cobrar, recordar, registrar pagos, exportar. **No** cambia reglas ni precios |
| `collections-readonly` | LECTURA | ver y exportar. Ninguna escritura |

El servidor ya bloquea la escritura al nivel `LECTURA` de forma transversal
(`require-portal-access.js`). Este frente hereda eso gratis.

### Tabla de credenciales

`portal_credential` **ya existe** y ya tiene `scope_type`, con `'WORLD'` en uso hoy
(`access.js`, consulta `mundosDe`). Se extiende su vocabulario:

```
scope_type ∈ { 'WORLD', 'MERCHANT', 'COLLECTIONS_WORLD', 'COLLECTIONS_MERCHANT' }
```

No hace falta tabla nueva. Una credencial de cobranzas apunta al mundo o al comercio y convive con
la credencial del portal del mundo o del comercio sin colisionar.

### Resolución de accesos

`resolverAccesos(usuario)` en `access.js` arma las "cajas" que el shell ofrece. Se agrega una cuarta:

```js
const nivelCobranzas = nivelDe(grupos, GRUPOS_COBRANZAS);
if (email && nivelCobranzas) {
  for (const c of await cobranzasDe(email)) {
    cajas.push({
      tipo: 'COBRANZAS',
      titulo: c.titulo,
      detalle: c.scope === 'WORLD'
        ? `Gestor de Cobranzas · ${c.world_name}`
        : `Gestor de Cobranzas · ${c.name} · ${c.world_name}`,
      alcance: c.scope,
      mundo: { code: c.world_code, nombre: c.world_name },
      comercio: c.scope === 'MERCHANT' ? { id: c.id, slug: c.portal_slug, nombre: c.name } : null,
      ruta: `/joi360app/cobranzas/${c.scope === 'WORLD' ? 'mundo' : 'comercio'}/${c.code}`,
      credencial: c.access_key,
      nivel: nivelCobranzas,
      soloLectura: nivelCobranzas === 'LECTURA',
    });
  }
}
```

`cobranzasDe(email)` cruza el correo contra los mundos y comercios que **tienen la capacidad activa**
y tienen a esa persona registrada. Un usuario con `collections-operator` pero sin ningún mundo ni
comercio que lo liste no ve ninguna caja, y recibe el mismo aviso que ya existe hoy:
*"Tu rol está bien, pero ningún mundo ni comercio tiene este correo registrado."*

Agregar `GRUPOS_COBRANZAS` al arreglo `reconocidos` evita que esos grupos caigan en
`gruposSinReconocer`.

### Guardia del frente

```js
async function requireCollections(scope, code, req) {
  const usuario = await cognito.verificar(cognito.bearer(req));
  const nivel = access.nivelDe(usuario.grupos, access.GRUPOS_COBRANZAS);
  if (!nivel) throw forbidden('Tu usuario no tiene acceso al Gestor de Cobranzas');
  const destino = await access.cobranzaDeEmail(usuario.email, scope, code);
  if (!destino) throw forbidden('No tenés acceso a esta cartera');
  if (!destino.capability_enabled) throw forbidden('Este titular no tiene el producto contratado');
  req.collectionsAccess = { email: usuario.email, nivel, soloLectura: nivel === 'LECTURA', scope, ...destino };
  return destino;
}
```

Espejo exacto de `requireWorld` y `requireMerchant`. Se exporta desde el mismo
`require-portal-access.js`.

---

## 6. Entrega del producto

El flujo replica la entrega que ya existe para mundos y comercios
(`ejecutarEntrega`, `markWorldDelivered`, `markMerchantDelivered`).

```
1. Red Pontis activa la capacidad en el mundo o en el comercio
2. Aparece la tarjeta "Entregar Gestor de Cobranzas"
3. Red Pontis indica el correo del titular
4. El sistema:
   a. crea o localiza el usuario en Cognito con ese correo
   b. lo agrega al grupo collections-* según el rol elegido
   c. emite la credencial en portal_credential con el scope_type correspondiente
   d. registra la entrega con fecha, quién la hizo y a qué correo
5. El titular recibe su acceso y entra por el shell, que le ofrece su caja de Cobranzas
6. Desde ahí gestiona: crea planes, carga cartera, define reglas, cobra
```

Reglas:

- Sin la capacidad activa no se puede entregar credencial.
- Desactivar la capacidad **revoca el acceso al panel** pero no borra datos ni el usuario de Cognito.
- Reemitir la credencial invalida la anterior.
- La entrega queda en `collection_audit_log` con `entity: 'delivery'`.

---

## 7. Qué hace Admin RP entonces

Admin RP **no contiene** el panel de cobranzas. Hace tres cosas, y nada más:

1. **Activa** la capacidad por mundo o por comercio.
2. **Entrega** las credenciales del portal.
3. **Ve el estado del producto**: si está activo, a quién se entregó, cuándo, y una vista transversal
   de salud (cuántos titulares lo tienen, cuántos lo usan, volumen agregado).

Lo que Admin RP **no** hace: crear planes del cliente, cargar su cartera, mandar sus recordatorios ni
cobrar por él. Eso es del titular, en su propio panel.

> Excepción operativa a definir: soporte de Red Pontis podría necesitar entrar al panel de un cliente
> para diagnosticar. Si se habilita, va como impersonación explícita, registrada en bitácora y con un
> aviso visible en el panel de que se está operando como soporte. **Pendiente de decisión.**

---

## 8. Requerimientos nuevos

Reemplazan a REQ-COB-001 a 003 de `requirements.md`.

### REQ-COB-001 — La capacidad existe en el catálogo con su alcance

Como responsable de la plataforma,
quiero que el gestor de cobranzas sea una capacidad del catálogo que declare que se activa por mundo
o por comercio,
para venderlo y habilitarlo con el mismo mecanismo que el resto del ecosistema.

**Criterios de aceptación**

- La capacidad aparece en `GET /catalogs/modules` con `scope: ['WORLD','MERCHANT']` y con `ownFront`.
- Las capacidades existentes se declaran `scope: ['WORLD']` y **su comportamiento no cambia**.
- Intentar activar por comercio una capacidad con `scope: ['WORLD']` responde
  `capability_scope_not_allowed`.
- El catálogo del admin muestra el alcance de cada capacidad.

### REQ-COB-002 — Activación por mundo y por comercio, independientes

Como operador de Red Pontis,
quiero activar el gestor a un mundo, a un comercio, o a los dos,
para venderlo por separado a cada titular.

**Criterios de aceptación**

- Activarla en un mundo **no** la activa en sus comercios.
- Activarla en un comercio **no** requiere que su mundo la tenga.
- Un mundo y uno de sus comercios pueden tenerla a la vez, cada uno con su cartera separada.
- Desactivarla revoca el acceso al panel y **no borra ningún dato**.

### REQ-COB-003 — Es un frente propio, no una sección de Admin RP

Como titular del producto,
quiero mi propio panel con su URL,
para gestionar mi cobranza sin entrar a la consola de Red Pontis.

**Criterios de aceptación**

- El panel se sirve en `/joi360app/cobranzas/:scope/:code` desde su propia entrada de build.
- El frente no importa código de `client/src/admin/`.
- Entrando sin sesión, redirige al login del shell.
- El panel muestra en su encabezado de qué titular es la cartera que se está viendo.

### REQ-COB-004 — Credenciales propias de Cognito

Como operador de Red Pontis,
quiero entregar al titular su propio usuario y rol,
para que entre a su panel sin credenciales prestadas.

**Criterios de aceptación**

- Existen los grupos `collections-admin`, `collections-operator` y `collections-readonly`, resueltos
  por el mismo mecanismo de sufijo que los grupos actuales.
- Un usuario con grupo de cobranzas pero sin mundo ni comercio que lo liste no ve ninguna caja y
  recibe el aviso correspondiente.
- `collections-readonly` no puede escribir nada: el servidor bloquea, y la interfaz deshabilita con
  el motivo visible.
- `collections-operator` no puede cambiar reglas ni precios de plan.
- Los grupos nuevos no caen en `gruposSinReconocer`.

### REQ-COB-005 — Entrega del producto

Como operador de Red Pontis,
quiero entregar el acceso al titular desde Admin RP,
para cerrar la venta sin pasos manuales fuera del sistema.

**Criterios de aceptación**

- Sin la capacidad activa, la entrega no está disponible.
- Al entregar: se crea o localiza el usuario en Cognito, se lo agrega al grupo del rol elegido, y se
  emite la credencial en `portal_credential` con el `scope_type` correspondiente.
- La entrega registra fecha, correo, rol y quién la hizo.
- Reemitir invalida la credencial anterior.
- Todo queda en bitácora.

### REQ-COB-006 — El shell ofrece la caja de Cobranzas

Como titular con varios accesos,
quiero ver mi panel de cobranzas junto a mis otros portales,
para entrar sin saber la URL.

**Criterios de aceptación**

- `GET /auth/me/access` devuelve una caja `tipo: 'COBRANZAS'` por cada cartera a la que la persona
  tiene acceso, con su `alcance`, su ruta y su credencial.
- Con una sola caja, el shell entra directo. Con varias, deja elegir.
- La caja dice claramente si es del mundo o de un comercio, y de cuál.

### REQ-COB-007 — Aislamiento por titular

Como responsable de la plataforma,
quiero que cada titular vea solo su cartera,
para que un comercio no vea la del mundo ni la de otro comercio.

**Criterios de aceptación**

- Toda consulta resuelve contra el titular de la sesión, no contra un id del cliente.
- Pedir datos de otro titular por id directo responde **403, no una lista vacía**.
- Un titular de alcance comercio no ve cargos de otros comercios del mismo mundo.
- Un titular de alcance mundo ve la cartera del mundo, y **no** la de los comercios que tienen su
  propio producto contratado: son carteras distintas.

---

## 9. Tareas que se agregan o cambian

Reemplazan la Fase 0 y la Fase 2 de `tasks.md`.

### T-01 (reemplazada) — Alcance en el catálogo
**Objetivo**: agregar `scope` y `ownFront` al catálogo, declarando las existentes como `['WORLD']`.
**Archivos**: `server/modules/capabilities/catalog.js`, `resolver.js`, `client/src/admin/Catalogo.jsx`, `store.js`.
**Terminado cuando**: el resolver no cambia de comportamiento para ninguna capacidad existente y el
admin muestra el alcance.
**Cubre**: REQ-COB-001.

### T-01b — Tabla `merchant_module`
**Objetivo**: activación por comercio.
**Archivos**: `docs/sql/AAAA-MM-DD-merchant-module.sql`, `server/modules/admin/*`.
**Depende de**: T-01.
**Cubre**: REQ-COB-002.

### T-01c — Grupos de Cognito y resolución de accesos
**Objetivo**: `GRUPOS_COBRANZAS`, `cobranzasDe`, `cobranzaDeEmail`, caja `COBRANZAS`, `requireCollections`.
**Archivos**: `server/auth/access.js`, `server/auth/require-portal-access.js`.
**Depende de**: T-01b.
**Terminado cuando**: un usuario con `collections-*` y una cartera asignada recibe su caja en
`/auth/me/access`, y pedir otra cartera da 403.
**Cubre**: REQ-COB-004, 006, 007.

### T-01d — Vocabulario de `portal_credential`
**Objetivo**: sumar `COLLECTIONS_WORLD` y `COLLECTIONS_MERCHANT` a `scope_type`.
**Archivos**: `docs/sql/AAAA-MM-DD-portal-credential-collections.sql`.
**Depende de**: T-01c.
**Cubre**: REQ-COB-004.

### T-01e — Entrega del producto desde Admin RP
**Objetivo**: tarjeta de entrega con creación de usuario en Cognito y emisión de credencial.
**Archivos**: `server/modules/admin/*`, `client/src/admin/MundoDetail.jsx`.
**Depende de**: T-01d.
**Cubre**: REQ-COB-005.

### T-02 (reemplazada) — Frente nuevo
**Objetivo**: entrada de build, shell propio y login del portal de cobranzas.
**Archivos**: `client/vite.config.js`, `client/cobranzas.html`, `client/src/cobranzas/`.
**Depende de**: T-01c.
**Terminado cuando**: `npm run build` emite el bundle nuevo, el portal carga en su ruta, y no importa
nada de `client/src/admin/`.
**Cubre**: REQ-COB-003.

> Las tareas T-03 en adelante de `tasks.md` siguen vigentes. Cambia una sola cosa: sus componentes y
> pantallas se construyen en `client/src/cobranzas/`, no en `client/src/admin/`. Los componentes
> base (`DataTable`, `KpiCard`, `FilterBar`, `Money`, `EstadoBadge`, `descargarCsv`) van a un lugar
> compartido, `client/src/shared/`, porque los van a usar los dos frentes.

---

## 10. Riesgos que introduce el cambio

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Agregar `scope` toca el resolver de capacidades, que alimenta cinco frentes | Alto | Las existentes se declaran `['WORLD']` explícitamente; el resolver ignora `merchant_module` para ellas. Comportamiento idéntico al actual |
| Un cuarto frente suma superficie de autenticación | Medio | Reutiliza Cognito, `nivelDe` y el bloqueo de escritura por nivel que ya existen. Cero mecanismo nuevo |
| Componentes compartidos entre admin y cobranzas | Medio | Se mueven a `client/src/shared/` **antes** de usarlos en el frente nuevo, no después |
| Dos carteras distintas en el mismo mundo (mundo y comercio) | Medio | Aislamiento por titular, no por mundo. El test de T-90 cubre exactamente este caso |
| Crear usuarios en Cognito desde el admin | Alto | Ya se hace para mundos y comercios. Se reutiliza ese camino, no se inventa otro |
