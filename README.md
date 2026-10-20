# Primer Paso FCE

Plataforma de inserción laboral para estudiantes de la FCE (Prosecretaría de Inserción Laboral). Trabajo del Desafío 07 de la Especialización en Negocios Digitales, FCE-UNLP.

**Equipo:** Lic. Lucas Oviedo (Product Owner) · Cra. María Virginia Affur (Scrum Master) · Cra. Paula Verónica Báez.
Todos los datos son ficticios.

## Qué hace (Sprint 1 + Sprint 2)
- **Tres perfiles con usuario y contraseña** (Supabase Auth): estudiante, organización y Prosecretaría.
- **Estudiante:** alta en 3 pasos (datos personales → avance según SIU Guaraní → test de BrOD, obligatorio). Ve todas las búsquedas, sabe en cuáles cumple y qué le falta, y ve su afinidad por competencias. Se postula con un clic; la base calcula la clasificación. La pestaña **Postularme** avisa las novedades desde su último ingreso.
- **Organización:** se registra con CUIT y puede publicar todas las búsquedas que necesite. Las publica con los mismos datos que carga el estudiante: carrera y avance (SIU Guaraní), perfil buscado en lenguaje simple y competencias (BrOD). Ve sus postulaciones de forma anónima hasta que la Prosecretaría las envía, y registra a quién seleccionó (HU6).
- **Controles de la Ley 26.427:**
  - convenio vigente;
  - cupo de pasantes según la planta (informativo: no bloquea la publicación; la Prosecretaría lo evalúa al enviar);
  - hasta 20 h semanales y 6 h 30 min por día;
  - de 2 a 12 meses;
  - asignación estímulo con convenio colectivo de referencia;
  - tutor/a;
  - ART y obra social;
  - al postularse: alumno regular, mayor de 18 y sin otra pasantía vigente.

  Se controlan en la pantalla y también en la base de datos.
- **Prosecretaría:** tablero con el seguimiento de cada búsqueda (sin postulaciones → pendiente de envío → con envío → con estudiante seleccionado o sin selección); evaluación de postulaciones (enviar a la organización o no enviar, con motivo); correos de novedades (los genera la base con un trigger); verificación del avance contra SIU Guaraní; organizaciones con convenio y cupo.

## Estructura
- `app/`, `components/`, `lib/`: aplicación Next.js (App Router) + TypeScript + Tailwind.
- `supabase/migrations/`: esquema, reglas, Row Level Security.
- `supabase/seed.sql`: datos y cuentas de prueba.
- `supabase/instalar-todo.sql`: lo mismo, en un solo archivo para pegar en el SQL Editor.

## Puesta en marcha
1. **Supabase.**
   - Crear un proyecto.
   - En *Authentication → Sign In / Providers → Email*, desactivar **Confirm email**.
   - En *SQL Editor*, pegar y correr `supabase/instalar-todo.sql`.
2. **Variables de entorno.** Copiar `.env.example` como `.env.local` y completar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (clave publicable; nunca la secret key ni la service_role)
3. **Local:** `npm install` y `npm run dev`.
4. **Vercel.**
   - *Add New → Project*, importar este repositorio.
   - Cargar las dos variables en *Environment Variables*.
   - Hacer *Deploy*.

## Cuentas de prueba (contraseña `demo1234`)
| Perfil | Correo |
|---|---|
| Estudiante | sofia@ · martin@ · lucia@ · tomas@ `alumnos.fce.example` |
| Organización | rrhh@estudioficticio.example · seleccion@bancoimaginario.example · empleo@villaejemplo.example · contacto@sinconvenio.example |
| Prosecretaría | prosecretaria.insercion@fce.example |

## Criterios de aceptación verificados
Probados de punta a punta contra la base con sus políticas:
- **Ingreso:** contraseña incorrecta, cuenta de otro perfil.
- **Estudiante:**
  - alta obligatoria con BrOD;
  - DNI duplicado;
  - novedades desde el último ingreso;
  - postulación con clasificación calculada en la base;
  - postulación duplicada bloqueada.
- **Organización:**
  - postulantes anónimos hasta el envío;
  - no puede ver ni cargar búsquedas de otra organización;
  - el convenio vigente lo controla la base; el cupo se informa y lo evalúa la Prosecretaría.
- **Prosecretaría:**
  - correo por cada búsqueda publicada y cada alta de organización;
  - verificación del avance;
  - si el estudiante cambia el avance, la verificación vuelve a quedar pendiente.

**Pendiente (Sprint 3):**
- HU8: afinidad con IA.
- HU14: recuperar contraseña.
- Envío real de correos (a confirmar con el docente).
