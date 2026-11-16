# IdeAgora Frontend

Frontend de IdeAgora con React, TypeScript y Vite.

## Registro de cuentas

La pantalla de registro guía al usuario en tres pasos: datos personales,
facultad/carrera de su universidad activa e intereses. Toda cuenta nueva inicia
con el rol `STUDENT`; los roles de director y administrador se asignan por
procesos institucionales separados. La cuenta se activa después de verificar el
correo institucional. Si el dominio del correo está asignado a una sede, la
selección académica corresponde a esa sede.

El formulario de inicio de sesión acepta correo y contraseña. El access token se
mantiene en memoria y el refresh token se transporta en una cookie `HttpOnly`.
El frontend renueva la sesión al abrir la aplicación y ofrece cierre de sesión.
Estudiante y director ingresan a `/home`; los administradores se redirigen a sus
rutas administrativas. La portada pública está en `/` e incluye navegación a
registro, inicio de sesión, información, servicios y exploración. La ruta
`/projects` no exige sesión, pero su catálogo espera la implementación del
módulo de proyectos.

## Inicio y diseño visual

La portada y el inicio para estudiantes/directores comparten la identidad
visual definida en `.agents/SKILLS/SKILL-Desgin.md`, con tipografía Nunito.
La interfaz ofrece apariencia clara, oscura o sincronizada con el sistema y
recuerda la preferencia en el navegador. Los efectos de aurora y flowlines son
decorativos y responsivos. Lucide React proporciona iconos y Framer Motion
anima las transiciones respetando la preferencia de movimiento reducido.

Los accesos de autenticación comparten una portada con un área difuminada a la
derecha para incorporar una imagen. Los paneles administrativos usan navegación
lateral y muestran confirmaciones y errores mediante diálogos modales.

Define `VITE_API_URL` si el backend no está disponible en
`http://localhost:3000`. Las cuentas administrativas no se crean desde el
formulario público.

## Gestión de universidades (HU-001)

Al iniciar sesión con una cuenta `ADMIN_GLOBAL`, la aplicación abre el panel
para crear, actualizar y dar de baja universidades, sedes y dominios. Desde
cada institución se pueden invitar administradores locales; la fotografía de
perfil es obligatoria y el enlace por correo permite aceptar el cargo y definir
la contraseña. Las universidades creadas permanecen pendientes hasta que un
representante acepte la invitación.

## Estructura académica (HU-003)

Las cuentas `ADMIN_LOCAL` ingresan al panel de su universidad o sede para
crear, editar y activar/inactivar facultades y carreras. Los registros
inactivos se conservan para el historial y dejan de ofrecerse en el registro
de estudiantes. Los nombres de carrera se ingresan completos y sin siglas.

## Hoja de vida profesional (HU-006)

Los directores completan la hoja de vida desde `/director/profile` mediante un
recorrido de cuatro pasos: resumen, formación, experiencia y envío a revisión.
Los documentos PDF opcionales se adjuntan al enviar; el administrador local
puede revisar el perfil desde su panel. Los cambios devuelven el perfil al
estado pendiente de validación.

```bash
npm install
npm run dev
```

Los formularios usan React Hook Form y Zod; la interfaz se adapta a pantallas de
escritorio y móviles con la identidad visual descrita en
`.agents/SKILLS/SKILL-Desgin.md`.
