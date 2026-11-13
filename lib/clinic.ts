/**
 * Datos de la clínica que no viven en la base.
 *
 * El esquema entregado no tiene columna de dirección, así que acá va
 * la dirección postal como constante. Si algún día se agrega la columna,
 * se borra este archivo (ver DECISIONS.md).
 */
export const CLINIC_ADDRESS = "Av. Providencia 1234, Of. 502, Santiago";
export const CLINIC_PHONE = "+56 2 2345 6789";
export const SUPPORT_EMAIL = "reservas@clinicadental.test";

/**
 * Identidad visible de una clínica. En multi-tenant casi todo viene de
 * `organizations`; estas constantes quedan sólo como respaldo para las
 * rutas públicas sin slug (portada y /reservar heredadas).
 */
export interface ClinicBrand {
  name: string;
  slug?: string;
  address?: string | null;
  phone?: string | null;
  supportEmail?: string | null;
}

export const DEFAULT_BRAND: ClinicBrand = {
  name: "Clínica",
  slug: undefined,
  address: CLINIC_ADDRESS,
  phone: CLINIC_PHONE,
  supportEmail: SUPPORT_EMAIL,
};

/** Copy legal: Ley 19.628, Ley 20.584 y DS 41/2012 MINSAL. */
export const CONSENT_TEXT =
  "Autorizo a la clínica a tratar mis datos personales (nombre, RUT, teléfono y correo) " +
  "para gestionar mis reservas, recordatorios de cita y mi ficha de atención conforme a la " +
  "Ley 19.628 y la Ley 20.584.";

export const PRIVACY_SUMMARY = [
  {
    title: "Qué guardamos",
    body: "Al reservar en línea registramos tu nombre, RUT, teléfono, correo electrónico, servicio, fecha y profesional elegido. Si recibes atención, el equipo clínico registra los antecedentes y evoluciones en tu ficha clínica electrónica.",
  },
  {
    title: "Para qué lo usamos",
    body: "Para gestionar tus citas (confirmar, reprogramar, cancelar y enviar recordatorios) y resguardar tu historial de atención de salud conforme a la normativa sanitaria vigente. No vendemos ni cedemos tus datos a terceros.",
  },
  {
    title: "Datos de salud y secreto profesional",
    body: "Tu ficha clínica es reservada (Ley 20.584 art. 13): sólo accede el personal con vínculo directo en tu atención, y cada lectura, edición, firma o exportación queda registrada de forma inmutable en la auditoría.",
  },
  {
    title: "Cuánto tiempo lo guardamos (15 años)",
    body: "Por mandato del artículo 12 de la Ley 20.584 y del artículo 11 del Decreto Supremo N° 41/2012 del MINSAL, la ficha clínica y su registro de auditoría se conservan por un plazo mínimo de 15 años desde la última atención.",
  },
  {
    title: "Tus derechos",
    body: "Puedes solicitar acceso, copia o rectificación de tus datos escribiendo a nuestro correo de contacto. Respecto de la ficha clínica, su conservación durante el plazo legal de 15 años es obligatoria por ley sanitaria.",
  },
];