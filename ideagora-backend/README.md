<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Backend de IdeAgora construido con NestJS, Prisma y PostgreSQL.

## Registro y autenticación

Configura las variables de `.env.example` en el entorno local. El registro
requiere SMTP para enviar el enlace de verificación; la contraseña se almacena
con bcrypt y los tokens de verificación se guardan como hashes.
Con Resend en modo de prueba solo se pueden enviar correos al destinatario
autorizado de la cuenta. Para entregar a otros destinatarios, verifica un
dominio de envío y configura `MAIL_FROM` con una dirección de ese dominio.

Rutas públicas:

- `POST /auth/login`: valida credenciales y devuelve un JWT de acceso; el refresh
  token se entrega en una cookie `HttpOnly`.
- `POST /auth/refresh`: rota el refresh token y entrega un JWT nuevo.
- `POST /auth/logout`: revoca el refresh token y elimina la cookie.
- `GET /auth/registration-options?email=usuario@universidad.edu`: valida que el
  dominio pertenezca a una universidad activa y devuelve facultades, carreras e
  intereses disponibles. Si el dominio está asociado a una sede, limita la
  selección a esa sede y a facultades generales de la universidad.
- `POST /auth/register`: crea una cuenta pendiente con rol `STUDENT`. El rol no
  se elige en el formulario; las cuentas administrativas se aprovisionan aparte.
- `POST /auth/verify-email`: activa la cuenta usando el token enviado al correo.
- `POST /auth/resend-verification`: reenvía un enlace para una cuenta pendiente.
  La respuesta no revela si el correo está registrado.
- `POST /auth/accept-admin-invitation`: acepta una invitación de administrador
  local, asigna la contraseña y activa la universidad pendiente. El token se
  recibe por correo y es de un solo uso.

## Gestión de universidades (HU-001)

Las rutas de gestión requieren un JWT activo y el rol `ADMIN_GLOBAL`. La
creación guarda la institución como `PENDING`; sus datos pueden guardarse antes
de invitar un representante. Al menos un administrador local debe aceptar por
correo para activar una universidad pendiente.

- `GET /universities` y `GET /universities/:id`: listar y consultar.
- `POST /universities` y `PUT /universities/:id`: crear/actualizar universidad,
  sedes y dominios autorizados.
- `DELETE /universities/:id`: baja lógica (`INACTIVE`), conserva los datos.
- `POST /universities/:id/reactivate`: reactiva como `ACTIVE` si ya hay un
  administrador local activo; de lo contrario queda `PENDING` hasta que un
  representante acepte su invitación.
- `POST /universities/:id/administrators`: invita representantes. El correo
  debe pertenecer al dominio declarado; se aceptan dominios específicos de sede.
- `POST /universities/:id/administrators/:administratorId/resend-invitation`:
  invalida el enlace anterior y envía otro.
- `POST /universities/admin-profile-photos`: carga una foto JPG, PNG o WebP de
  hasta 5 MB; devuelve la ruta que se incluye en la invitación.

Las acciones administrativas se registran en `audit_logs`. Las fotos se guardan
en el directorio configurado por `UPLOADS_DIR` (por defecto
`uploads/admin-profile-photos`); en producción ese directorio debe estar en un
volumen persistente y respaldado.

## Estructura académica (HU-003)

Las rutas de estructura académica requieren un JWT activo y el rol
`ADMIN_LOCAL`. El servidor obtiene universidad y sede desde la asignación del
administrador; un administrador de sede solo puede modificar facultades de esa
sede. Los registros se inactivan en vez de eliminarse y cada cambio se registra
en `audit_logs`.

- `GET /academic-structure`: consulta las facultades, carreras y sedes dentro
  del ámbito asignado.
- `POST /academic-structure/faculties` y `PUT /academic-structure/faculties/:id`:
  crean y actualizan facultades.
- `PATCH /academic-structure/faculties/:id/status`: activa o inactiva una
  facultad.
- `POST /academic-structure/faculties/:facultyId/careers` y
  `PUT /academic-structure/careers/:id`: crean y actualizan carreras.
- `PATCH /academic-structure/careers/:id/status`: activa o inactiva una
  carrera.

Los nombres e identificadores se validan para evitar duplicados en su ámbito
académico (facultad dentro de universidad/sede y carrera dentro de facultad).
Las carreras deben registrarse con el nombre completo, sin siglas ni
abreviaturas.

## Gestión de usuarios (HU-004)

Las rutas de gestión requieren un JWT activo y el rol `ADMIN_GLOBAL` o
`ADMIN_LOCAL`. El administrador global puede gestionar administradores locales,
estudiantes y directores; el administrador local solo puede gestionar
estudiantes y directores de su universidad. Las cuentas pendientes de verificar
se muestran, pero no se pueden activar ni suspender desde este flujo.

- `GET /administration/users`: consulta las cuentas dentro del ámbito del
  administrador.
- `POST /administration/users/:id/suspension`: suspende una cuenta activa.
  Requiere motivo, contraseña del administrador, confirmación exacta del nombre
  y una fecha futura o suspensión permanente.
- `POST /administration/users/:id/reactivation`: reactiva una cuenta suspendida.
  Requiere motivo, contraseña del administrador y confirmación exacta del nombre.

Las transiciones, sus motivos y la identidad del administrador se registran en
`audit_logs`. Al suspender, se revocan todos los refresh tokens de la cuenta.
Las suspensiones temporales vencidas se levantan al consultar usuarios o cuando
la cuenta intenta iniciar sesión. El correo se envía después de guardar el
cambio; si SMTP falla, la respuesta indica que el cambio persistió y que solo
falló la notificación.

## Hoja de vida profesional (HU-006)

Las rutas de edición de la hoja de vida y sus documentos requieren un JWT activo
y el rol `DIRECTOR`. Los documentos se guardan en `DIRECTOR_DOCUMENTS_DIR` (por
defecto `uploads/director-documents`) y no son públicos; el director y el
administrador local autorizado descargan cada archivo a través de rutas
protegidas. Se aceptan únicamente archivos PDF válidos de hasta 10 MB por
archivo.

- `GET /profiles/me` y `PUT /profiles/me`: consultar y guardar el resumen,
  especializaciones, títulos, experiencia y enlaces profesionales.
- `POST /profiles/me/documents`: cargar un PDF de respaldo.
- `GET /profiles/me/documents/:documentId`: descargar un documento propio.
- `GET /profiles/review-queue`: el administrador local consulta perfiles
  pendientes de su universidad o sede.
- `PATCH /profiles/:profileId/review`: aprobar o rechazar un perfil pendiente;
  el rechazo requiere motivo.
- `GET /profiles/review-queue/:profileId/documents/:documentId`: consultar los
  respaldos dentro del ámbito del administrador local.

Al guardar cambios o agregar documentos, el perfil vuelve a `PENDING`; para
aprobarlo debe incluir resumen, especializaciones, títulos y experiencia. Las
revisiones y modificaciones de perfil quedan registradas en `audit_logs`. Una
cuenta suspendida no puede acceder a estas rutas porque la autenticación
requiere que el usuario esté activo.

Antes de registrar usuarios, deben existir en la base de datos una universidad
activa, su dominio institucional y sus facultades/carreras activas. Los intereses
se obtienen de `interest_catalog`.

El frontend puede configurarse con `VITE_API_URL` (por defecto
`http://localhost:3000`). `FRONTEND_URL` debe apuntar al origen del frontend para
que el enlace del correo regrese a la pantalla de verificación.

## Setup

```bash
npm install
npm run start:dev
```

Completa `DATABASE_URL` y las credenciales SMTP de `.env.example` en tu `.env`
(sin reemplazar valores ya configurados), y define `JWT_SECRET` con una clave
aleatoria de al menos 32 bytes antes de iniciar el servicio. Puedes generarla
localmente con:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

### Primer administrador global

No existe una contraseña fija de fábrica ni se permite registrar este rol desde
la pantalla pública. Para crear la primera cuenta, desde la terminal y dentro de
`ideagora-backend`, proporciona datos propios y ejecuta el bootstrap una sola
vez. El proceso exige una contraseña de al menos 16 caracteres (máximo 72 bytes
UTF-8), la guarda con bcrypt y registra la acción en `audit_logs`. Solo crea el
primer administrador; no eleva cuentas existentes ni restablece contraseñas.

En Git Bash, el siguiente proceso oculta la contraseña durante su ingreso y
elimina las variables de la sesión al terminar:

```bash
read -r -p "Correo del administrador global: " INITIAL_ADMIN_EMAIL
read -r -p "Nombres: " INITIAL_ADMIN_FIRST_NAME
read -r -p "Apellidos: " INITIAL_ADMIN_LAST_NAME
read -r -s -p "Contraseña inicial (16+ caracteres): " INITIAL_ADMIN_PASSWORD
printf '\n'
export INITIAL_ADMIN_EMAIL INITIAL_ADMIN_FIRST_NAME INITIAL_ADMIN_LAST_NAME INITIAL_ADMIN_PASSWORD
npm run bootstrap:admin
status=$?
unset INITIAL_ADMIN_EMAIL INITIAL_ADMIN_FIRST_NAME INITIAL_ADMIN_LAST_NAME INITIAL_ADMIN_PASSWORD
if [ "$status" -ne 0 ]; then exit "$status"; fi
```

El comando necesita que `.env` contenga un `DATABASE_URL` válido. Después,
inicia backend y frontend, abre `http://localhost:5173/login` e ingresa con el
correo y contraseña que acabas de configurar. La cuenta se autentica por el
mismo flujo seguro del sistema (bloqueo de intentos, JWT, refresh token y
auditoría); el rol se comprueba en el backend. No guardes estas credenciales en
el repositorio ni en logs.

El inicio de sesión permite cinco intentos fallidos antes de bloquear la cuenta
durante 15 minutos. El JWT de acceso dura 15 minutos; el refresh token dura siete
días, se rota en cada renovación y se almacena como hash. Los accesos y cierres
de sesión de administradores se registran en `audit_logs`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. To connect it, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It writes the app key and secret into `.env` and makes every `nest start` script (`start`, `start:dev`, `start:debug`) load it. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand: create an application and an API key at [observe.nestjs.com](https://observe.nestjs.com), and set the pair as `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment the app runs in.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
