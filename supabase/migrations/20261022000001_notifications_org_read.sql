-- Realtime en la vista "todo el equipo" del panel.
--
-- El panel se refresca en vivo por eventos INSERT de `notifications`, y el
-- filtro del canal llega a la base: Realtime aplica RLS de SELECT para
-- decidir qué filas puede ver la sesión que se combate en el canal.
--
-- Hasta acá la única política era `doctor_id = auth.uid()`: cada profesional
-- recibía sus notificaciones. Pero admin y recepción ven la agenda de todo el
-- equipo (incluso con "?doctor=all", que es la vista por defecto de
-- recepción), y ahí las citas canceladas por el paciente dejan una
-- notificación con el doctor_id del profesional dueño, que esa sesión no podía
-- leer ni recibir: el evento no llegaba y la agenda quedaba congelada hasta
-- refrescar a mano.
--
-- La política nueva mantiene lo propio y agrega la vista por organización:

drop policy if exists doctor_read_own_notifications on notifications;

create policy doctor_read_own_notifications on notifications
  for select to authenticated
  using (
    doctor_id = auth.uid()
    or exists (
      select 1 from doctors d
      where d.id = auth.uid()
        and d.role in ('admin', 'reception')
        and d.org_id = notifications.org_id
    )
  );

comment on policy doctor_read_own_notifications on notifications is
  'Cada profesional lee las notificaciones propias; admin y recepción leen
  también las de su organización, para que la vista de equipo del panel
  reciba los eventos en vivo de cualquier profesional.';
