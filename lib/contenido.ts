// Contenido estático de la portada (íconos e información de programas)
export const POTENCIA: { id: string; ico: string; c: string; t: string; s: string; d: string; estado: string }[] =[
 {id:"inter",ico:"inter",c:"",t:"Intercambio",s:"Experiencias en otras universidades",d:"Movilidad estudiantil y prácticas en universidades con convenio. La Prosecretaría te orienta sobre convocatorias y requisitos.",estado:"Convocatorias en la Prosecretaría"},
 {id:"semi",ico:"semi",c:"p",t:"Semilleros",s:"Investigación, tecnología y emprendimiento",d:"Grupos de estudiantes que trabajan con docentes en proyectos reales, incluido el semillero de mujeres en tecnología.",estado:"Próximamente"},
 {id:"prog",ico:"prog",c:"y",t:"Programas de inserción profesional",s:"Talleres de CV, entrevistas y LinkedIn",d:"Talleres prácticos para preparar tu CV, tu perfil de LinkedIn y tus entrevistas, articulados con el test vocacional de BrOD.",estado:"Próximamente"},
 {id:"ruta",ico:"ruta",c:"g",t:"Ruta de empleabilidad",s:"Tu camino paso a paso",d:"Un recorrido personalizado según tu etapa y tus competencias: qué hacer primero, qué cursos sumar y a qué búsquedas apuntar.",estado:"Próximamente · roadmap"}
];

export const I: Record<string, string> = {
 inter:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c3.5 3.5 5 7.5 5 12s-1.5 8.5-5 12M16 4c-3.5 3.5-5 7.5-5 12s1.5 8.5 5 12"/></svg>',
 semi:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 28V15"/><path d="M16 17c0-5-4-8-9-8 0 5 4 8 9 8z"/><path d="M16 14c0-5 4-9 10-9 0 6-4 9-10 9z"/><path d="M9 28h14"/></svg>',
 prog:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="22" height="16" rx="2.5"/><path d="M12 9V6.5A1.5 1.5 0 0 1 13.5 5h5A1.5 1.5 0 0 1 20 6.5V9M5 16h22"/><path d="M14 16v2h4v-2"/></svg>',
 est:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l13-6 13 6-13 6z"/><path d="M8 14.5v6c0 2 3.6 4 8 4s8-2 8-4v-6"/><path d="M29 12v7"/></svg>',
 org:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="9" width="22" height="17" rx="2"/><path d="M12 9V6.5A1.5 1.5 0 0 1 13.5 5h5A1.5 1.5 0 0 1 20 6.5V9"/><path d="M5 16h22"/><path d="M14 16v2h4v-2"/></svg>',
 pro:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="5" width="18" height="23" rx="2"/><path d="M12 5V3.5h8V5"/><path d="M11 13l2.2 2.2L17 11.5"/><path d="M11 21h10"/></svg>',
 pas:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="24" height="16" rx="2"/><path d="M4 13h24"/><circle cx="16" cy="18.5" r="2.5"/><path d="M9 4.5v4M23 4.5v4"/></svg>',
 emp:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="11"/><path d="M16 9v7l5 3"/></svg>',
 cum:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="11"/><path d="M11 16.5l3.4 3.4L21.5 12.5"/></svg>',
 ruta:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 26c0-5 4-6 8-8s7-4 7-9"/><circle cx="8" cy="26" r="2.5"/><path d="M23 3.5a4 4 0 0 1 4 4c0 3-4 6.5-4 6.5s-4-3.5-4-6.5a4 4 0 0 1 4-4z"/></svg>',
 comp:'<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h8v3a2.5 2.5 0 1 0 5 0V6h7v8h-3a2.5 2.5 0 1 0 0 5h3v7H18v-3a2.5 2.5 0 1 0-5 0v3H6V19h3a2.5 2.5 0 1 0 0-5H6z"/></svg>'
};
