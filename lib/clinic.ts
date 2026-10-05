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

/** Copy legal: Ley 19.628 sobre protección de la vida privada. */
export const CONSENT_TEXT =
  "Autorizo a la clínica a guardar mis datos personales (nombre, RUT, teléfono y correo) " +
  "únicamente para gestionar mis citas y enviarme recordatorios. No se almacenan datos " +
  "clínicos ni información de salud en este sistema. Puedo pedir la eliminación de mis " +
  "datos en cualquier momento.";

export const PRIVACY_SUMMARY = [
  {
    title: "Qué guardamos",
    body: "Nombre, RUT, teléfono y correo electrónico, además del día y hora de tu cita y el profesional elegido. Nada más.",
  },
  {
    title: "Para qué lo usamos",
    body: "Sólo para gestionar tus citas: confirmar, reprogramar, cancelar y recordar. No vendemos ni cedemos tus datos.",
  },
  {
    title: "Datos de salud",
    body: "Este sistema no registra motivo de consulta, diagnóstico ni tratamiento. Esa información vive en la ficha clínica de la clínica, con sus propias medidas de seguridad.",
  },
  {
    title: "Cuánto tiempo lo guardamos",
    body: "Tus datos se conservan por el plazo legal aplicable a agendas y documentos de respaldo (5 años) y después se eliminan o anonimizan.",
  },
  {
    title: "Tus derechos",
    body: "Puedes acceder, corregir o eliminar tus datos escribiendo a nuestro correo. Responemos dentro de 20 días hábiles.",
  },
];