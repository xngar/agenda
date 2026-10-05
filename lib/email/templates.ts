/**
 * Plantillas de correo. Español de Chile, tono de clínica.
 *
 * Se arman como HTML inline (sin clases de Tailwind): los clientes de
 * correo noRenderizan CSS moderno y las clasesDark/light se pierden.
 * Sólo estilos inline + colores de la paleta de marca.
 */

const PALETTE = {
  navy: "#0B3C7A",
  navyDark: "#082C5B",
  sky: "#7CC7F0",
  skySoft: "#EAF6FD",
  border: "#DBE4EE",
  text: "#1E293B",
  muted: "#5A6B80",
} as const;

function shell(title: string, preheader: string, clinicName: string, body: string): string {
  return `<!doctype html>
<html lang="es-CL">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FA;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FA;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${PALETTE.border};border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:${PALETTE.navy};padding:20px 28px;">
        <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:-0.01em;">${escapeHtml(clinicName)}</span>
        <span style="color:${PALETTE.sky};font-size:13px;"> · Agenda online</span>
      </td>
    </tr>
    <tr><td style="padding:28px;color:${PALETTE.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;">
      ${body}
    </td></tr>
    <tr>
      <td style="background:${PALETTE.skySoft};padding:16px 28px;color:${PALETTE.muted};font-size:12px;line-height:1.5;border-top:1px solid ${PALETTE.border};">
        Una hora bien agendada hace la diferencia. Si necesitas cambiar algo, responde a este correo o usa el enlace de tu cita.
      </td>
    </tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;color:${PALETTE.muted};font-size:11px;line-height:1.5;">
    Usamos tus datos sólo para gestionar tu cita (Ley 19.628). Este sistema no almacena información clínica.
  </p>
</td></tr>
</table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:${PALETTE.muted};font-size:13px;width:110px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:${PALETTE.text};font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${PALETTE.navy};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>
  </p>
  <p style="margin:0;font-size:12px;color:${PALETTE.muted};word-break:break-all;">Si el botón no funciona, copia este enlace:<br>${href}</p>`;
}

export interface BookingEmailData {
  patientName: string;
  clinicName: string;
  doctorName: string;
  specialty?: string | null;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  clinicAddress: string;
  manageUrl: string;
}

export function bookingConfirmedHtml(data: BookingEmailData): string {
  return shell(
    "Cita confirmada",
    `Cita confirmada el ${data.dateLabel} a las ${data.timeLabel}`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">¡Cita confirmada, ${escapeHtml(firstName(data.patientName))}!</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">Te esperamos. Acuérdate de llegar 10 minutos antes para tu evaluación.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.skySoft};border:1px solid ${PALETTE.border};border-radius:12px;padding:8px 16px;">
       ${detailRow("Fecha", escapeHtml(data.dateLabel))}
       ${detailRow("Hora", escapeHtml(data.timeLabel))}
       ${detailRow("Profesional", escapeHtml(data.doctorName))}
       ${data.specialty ? detailRow("Especialidad", escapeHtml(data.specialty)) : ""}
       ${detailRow("Servicio", escapeHtml(data.serviceName))}
       ${detailRow("Dirección", escapeHtml(data.clinicAddress))}
     </table>
     ${button(data.manageUrl, "Ver o cambiar mi cita")}`,
  );
}

export function bookingRescheduledHtml(data: BookingEmailData): string {
  return shell(
    "Cita reprogramada",
    `Tu cita ahora es el ${data.dateLabel} a las ${data.timeLabel}`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">Reprogramamos tu cita</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">Este es el nuevo horario que elegiste:</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.skySoft};border:1px solid ${PALETTE.border};border-radius:12px;">
       ${detailRow("Fecha", escapeHtml(data.dateLabel))}
       ${detailRow("Hora", escapeHtml(data.timeLabel))}
       ${detailRow("Profesional", escapeHtml(data.doctorName))}
       ${detailRow("Servicio", escapeHtml(data.serviceName))}
       ${detailRow("Dirección", escapeHtml(data.clinicAddress))}
     </table>
     ${button(data.manageUrl, "Ver mi cita")}`,
  );
}

export function bookingCancelledHtml(
  data: Omit<BookingEmailData, "manageUrl"> & { reason?: string | null; manageUrl?: string },
): string {
  return shell(
    "Cita cancelada",
    `Tu cita del ${data.dateLabel} a las ${data.timeLabel} fue cancelada`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">Tu cita fue cancelada</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">La hora <strong>${escapeHtml(data.dateLabel)} a las ${escapeHtml(data.timeLabel)}</strong> quedó liberada.</p>
     ${data.reason ? `<p style="margin:0 0 16px;color:${PALETTE.text};"><strong>Motivo:</strong> ${escapeHtml(data.reason)}</p>` : ""}
     <p style="margin:0;color:${PALETTE.muted};">Cuando quieras volver a agendar, entra a nuestro sitio y reserva en línea.</p>
     ${data.manageUrl ? button(data.manageUrl, "Elegir una nueva hora") : ""}`,
  );
}

export function bookingReminderHtml(data: BookingEmailData): string {
  return shell(
    "Recordatorio de cita",
    `Mañana te esperamos a las ${data.timeLabel}`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">Te recordamos tu cita</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">Hola ${escapeHtml(firstName(data.patientName))}, tu cita es mañana:</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.skySoft};border:1px solid ${PALETTE.border};border-radius:12px;">
       ${detailRow("Fecha", escapeHtml(data.dateLabel))}
       ${detailRow("Hora", escapeHtml(data.timeLabel))}
       ${detailRow("Profesional", escapeHtml(data.doctorName))}
       ${detailRow("Servicio", escapeHtml(data.serviceName))}
       ${detailRow("Dirección", escapeHtml(data.clinicAddress))}
     </table>
     ${button(data.manageUrl, "Ver mi cita")}`,
  );
}

export function doctorNewBookingHtml(data: {
  clinicName: string;
  patientName: string;
  dateLabel: string;
  timeLabel: string;
  serviceName: string;
  dashboardUrl: string;
}): string {
  return shell(
    "Nueva reserva",
    `${data.patientName} reservó el ${data.dateLabel} a las ${data.timeLabel}`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">Nueva reserva</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">Se agendó una hora en tu agenda.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.skySoft};border:1px solid ${PALETTE.border};border-radius:12px;">
       ${detailRow("Paciente", escapeHtml(data.patientName))}
       ${detailRow("Fecha", escapeHtml(data.dateLabel))}
       ${detailRow("Hora", escapeHtml(data.timeLabel))}
       ${detailRow("Servicio", escapeHtml(data.serviceName))}
     </table>
     ${button(data.dashboardUrl, "Abrir la agenda")}`,
  );
}

export function doctorChangeHtml(
  change: "rescheduled" | "cancelled",
  data: {
    clinicName: string;
    patientName: string;
    dateLabel: string;
    timeLabel: string;
    serviceName: string;
    dashboardUrl: string;
  },
): string {
  const cancelled = change === "cancelled";
  return shell(
    cancelled ? "Cita cancelada" : "Cita reprogramada",
    `${data.patientName}: ${cancelled ? "cita cancelada" : "cita reprogramada"}`,
    data.clinicName,
    `<h1 style="margin:0 0 8px;font-size:22px;color:${PALETTE.navy};">${
      cancelled ? "Una cita fue cancelada" : "Una cita fue reprogramada"
    }</h1>
     <p style="margin:0 0 20px;color:${PALETTE.muted};">Ahorra el nuevo horario si necesitas volver a contactarlo.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PALETTE.skySoft};border:1px solid ${PALETTE.border};border-radius:12px;">
       ${detailRow("Paciente", escapeHtml(data.patientName))}
       ${detailRow("Fecha", escapeHtml(data.dateLabel))}
       ${detailRow("Hora", escapeHtml(data.timeLabel))}
       ${detailRow("Servicio", escapeHtml(data.serviceName))}
     </table>
     ${button(data.dashboardUrl, "Abrir la agenda")}`,
  );
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}