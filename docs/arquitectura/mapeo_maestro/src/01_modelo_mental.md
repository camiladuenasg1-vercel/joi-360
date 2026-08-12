# Modelo Mental: Mundo → Capacidad → Configuración → Render

En criollo, sin código: JOI360 es una plataforma donde RedPontis vende "comunidades digitales" (**Mundos**) a clientes como un colegio, un centro comercial o un evento. Cada Mundo puede prender un subconjunto de **Capacidades** (Wallet, Comercio, Eventos, Menú, etc.) — como un menú de funcionalidades que se activan o no según lo que ese cliente contrató. Cada capacidad activa trae su propia **Configuración** (tarifas, límites, qué tan estricta es una regla) que el mundo o RedPontis ajustan. Y esa configuración es lo que determina qué se **renderiza** — qué botón aparece, qué pantalla existe, qué tabla de datos se llena — en cada una de las aplicaciones donde un humano interactúa con el sistema.

La regla de oro para cualquiera que construya sobre esto: **una capacidad nunca "vive" en un solo lugar**. Prender Wallet, por ejemplo, no es una sola pantalla — es una fila en una tabla de configuración en Supabase, que varias apps distintas leen y usan para decidir qué mostrarle a distintos tipos de usuario. Eso es lo que este documento mapea completo.

## Los 6 frentes del ecosistema

| Frente | Quién lo usa | Cómo entra | Qué controla |
|---|---|---|---|
| **Admin RedPontis** | El equipo interno de RedPontis | Login con email/password (`/login`) | Todo — es el único frente que puede crear mundos, activar/configurar capacidades, definir tarifas, aprobar eventos y comercios, ver liquidaciones |
| **Panel de Mundo (Sponsor)** | El cliente dueño del mundo (ej. el colegio, el mall) | Login propio del mundo, entregado por RedPontis | Su propia operación diaria dentro de lo que RedPontis ya activó — no puede tocar tarifas ni activar capacidades nuevas |
| **Panel de Merchant** | Un comercio afiliado a un mundo | Login/PIN propio del comercio | Su propio catálogo, cobros, cierre de caja |
| **Panel de Organizador** | Un organizador externo de eventos (modelo B2B) | Login propio, entregado por RedPontis | Sus propios eventos, comercios afiliados a ellos, asistencia |
| **Superapp** | El usuario final (padre de familia, visitante, comprador) | Registro/login propio con verificación de correo | Su propia experiencia — saldo, compras, entradas, familia |
| **POS / Operador** | Personal de piso (cajero, portero, staff del evento) | Código corto + PIN de 4 dígitos, sin email | Cobrar, vincular banditas, control de acceso, entrega física |

Cada capacidad puede aparecer en varios de estos 6 frentes a la vez, con una vista distinta según el rol: Wallet, por ejemplo, se configura en Admin RedPontis, se opera desde el POS/Operador, y se vive desde la Superapp — son 3 experiencias completamente distintas de la misma capacidad, alimentadas por la misma configuración de fondo.

## El mecanismo de fondo (resumen, ver Backbone Técnico para el detalle completo)

1. RedPontis define qué capacidades EXISTEN en general (el catálogo maestro) y qué tan maduras están (lista para usar / en desarrollo / planificada).
2. Al crear o editar un Mundo, RedPontis (o a veces el propio mundo, según el caso) elige qué capacidades de ese catálogo prender, y ajusta su configuración específica para ese mundo — tarifas, límites, textos.
3. Esa decisión se guarda en Supabase, en tablas separadas de "qué capacidad está prendida en qué mundo" y "qué feature específico de esa capacidad está prendido".
4. Cada aplicación (Superapp, POS, los distintos paneles) lee esa configuración en vivo y decide, componente por componente, si mostrar algo o no — un botón de "Bandita NFC" en la Superapp, por ejemplo, solo aparece si la capacidad Wallet está prendida Y el feature específico de bandita está prendido Y el mundo configuró que sí usa pulseras físicas.

Este último punto — que la visibilidad de cada botón/pantalla depende de una cadena de condiciones, no de una sola — es la razón por la que este documento dedica una sección entera a mapear, capacidad por capacidad y frente por frente, exactamente qué condición gatea qué. Es también la fuente más común de bugs reales encontrados durante la construcción (ej. un botón que aparecía para todos los mundos porque le faltaba una de esas condiciones).
