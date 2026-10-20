"use client";
import type { ReactNode } from "react";

export function Err({ msg }: { msg?: string }) {
  return msg ? <span className="err">{msg}</span> : null;
}

export function Field({ id, label, err, hint, full, children }: { id?: string; label: ReactNode; err?: string; hint?: ReactNode; full?: boolean; children: ReactNode }) {
  return (
    <div className={`field${full ? " full" : ""}${err ? " invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      <Err msg={err} />
    </div>
  );
}

export function Notice({ tipo, children, role }: { tipo?: "warn" | "ok" | "new"; children: ReactNode; role?: string }) {
  return <div className={`notice${tipo ? " " + tipo : ""}`} role={role}>{children}</div>;
}

export function Stepper({ paso }: { paso: number }) {
  const s = ["Datos personales", "Datos académicos", "Test de BrOD"];
  return (
    <ol className="stepper" aria-label="Pasos del alta">
      {s.map((x, i) => (
        <li key={x} className={i + 1 < paso ? "done" : i + 1 === paso ? "cur" : ""} aria-current={i + 1 === paso ? "step" : undefined}>
          <span>{i + 1 < paso ? "✔" : i + 1}</span>{x}
        </li>
      ))}
    </ol>
  );
}

export function Icono({ svg, className }: { svg: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Badge({ n }: { n: number }) {
  return n ? <span className="bdg" aria-label={`${n} nuevas`}>{n}</span> : null;
}

export function Encabezado({ eyebrow, titulo, children }: { eyebrow?: ReactNode; titulo: ReactNode; children?: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h1>{titulo}</h1>
      {children}
    </section>
  );
}
