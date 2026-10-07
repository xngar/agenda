-- 20260102000011 · Ficha clínica: datos demo y organización médica
--
-- 1) La organización 'clinica-feliz' deja de ser odontológica y pasa a
--    'medical' para demostrar que la ficha ramifica por tipo de org.
-- 2) Datos demo odontológicos para 'sonrisa-dental' (catálogo, antecedentes,
--    odontograma, plan, recetas, consentimientos y una atención firmada vía
--    el trigger real de firma).

-- ---------------------------------------------------------------------------
-- 1) Organization demo: clinica-feliz -> medical
-- ---------------------------------------------------------------------------
update organizations
set type = 'medical'
where slug = 'clinica-feliz' and type <> 'medical';

-- ---------------------------------------------------------------------------
-- 2) Catálogo de tratamientos para sonrisa-dental (idempotente por org+nombre)
-- ---------------------------------------------------------------------------
insert into dental_treatments_catalog (org_id, name, default_value, active, created_by)
select o.id, c.name, c.value, true, null
from organizations o, (values
  ('Revisión integral', 20000),
  ('Limpieza', 30000),
  ('Obturación', 45000),
  ('Endodoncia', 180000),
  ('Corona de porcelana', 280000)
) as c(name, value)
where o.slug = 'sonrisa-dental'
on conflict (org_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Datos demo odontológicos para el paciente 'Mauricio Mauricio'
-- ---------------------------------------------------------------------------
do $$
declare
  v_org     uuid;
  v_patient uuid;
  v_camila  uuid;
  v_seba    uuid;
  v_plan    uuid;
  v_enc     uuid;
begin
  select o.id into v_org from organizations o where o.slug = 'sonrisa-dental';
  select p.id into v_patient from patients p where p.org_id = v_org and p.full_name = 'Mauricio Mauricio';
  select d.id into v_camila from doctors d join auth.users u on u.id = d.id
    where d.org_id = v_org and u.email = 'camila.rojas@clinicadental.test';
  select d.id into v_seba from doctors d join auth.users u on u.id = d.id
    where d.org_id = v_org and u.email = 'sebastian.munoz@clinicadental.test';

  if v_patient is null or v_camila is null then
    raise notice 'Ficha demo: no se encuentra paciente Mauricio o la Dra. Camila; se omite el demo.';
    return;
  end if;

  if not exists (select 1 from encounters where patient_id = v_patient and status = 'signed') then
    -- Perfil de especialidad del paciente (éste es el jsonb que ramifica por tipo)
    update patients
    set specialty_profile = jsonb_build_object(
      'motive', 'Dolor intermitente en sector posterior derecho desde hace dos semanas',
      'gumDisease', 'No refiere',
      'smilingHigh', false,
      'notes', 'Paciente tranquilo, buena cooperación',
      'previousXrays', 'Sin radiografías previas en la clínica'
    )
    where id = v_patient;

    -- Antecedentes generales
    insert into patient_medical_background
      (org_id, patient_id, motivo_consulta, antecedentes_medicos, medicamentos,
       alergias, antecedentes_familiares, habitos, embarazo_lactancia, updated_by)
    values
      (v_org, v_patient,
       'Dolor intermitente en el maxilar inferior derecho',
       'Hipertensión controlada. Sin hospitalizaciones.',
       '[{"nombre": "Losartán", "detalle": "50 mg al día"}, {"nombre": "Ibuprofeno", "detalle": "400 mg cada 8 h si dolor"}]'::jsonb,
       '["penicilina"]'::jsonb,
       'Madre con diabetes tipo 2',
       '{"fuma": false, "alcohol": false, "ejercicio": true}'::jsonb,
       null,
       v_camila)
    on conflict (patient_id) do update
      set motivo_consulta = excluded.motivo_consulta,
          antecedentes_medicos = excluded.antecedentes_medicos,
          medicamentos = excluded.medicamentos,
          alergias = excluded.alergias,
          antecedentes_familiares = excluded.antecedentes_familiares,
          habitos = excluded.habitos,
          updated_by = excluded.updated_by;

    -- Odontograma
    insert into dental_chart_entries (org_id, patient_id, tooth, dentition, face, state, recorded_at, created_by)
    select v_org, v_patient, t.tooth, 'permanent', t.face, t.state, current_date, v_camila
    from (values
      (16, 'occlusal', 'caries'),
      (16, 'vestibular', 'sana'),
      (16, 'lingual', 'sana'),
      (16, 'mesial', 'sana'),
      (16, 'distal', 'sana'),
      (36, 'occlusal', 'obturada'),
      (36, 'lingual', 'obturada'),
      (21, 'vestibular', 'sana'),
      (21, 'incisal', 'sana'),
      (46, 'occlusal', 'sana')
    ) as t(tooth, face, state);

    -- Plan de tratamiento
    select id into v_plan from dental_treatments_catalog
      where org_id = v_org and name = 'Obturación';
    insert into dental_treatment_plan_items
      (org_id, patient_id, tooth, treatment_id, description, priority, stage, value, status, approved, approved_at, created_by)
    values
      (v_org, v_patient, 46, v_plan, 'Obturación clase I en pieza 46', 1, 'Evaluación', 45000, 'pendiente', false, null, v_camila),
      (v_org, v_patient, 36, v_plan, 'Detección de filtración en obturación previa', 2, 'Evaluación', 45000, 'aceptado', true, now(), v_camila);

    -- Receta
    insert into prescriptions
      (org_id, patient_id, medication, dose, route, frequency, duration, created_by)
    values
      (v_org, v_patient, 'Amoxicilina 500 mg', '1 cápsula', 'oral', 'cada 8 horas', '7 días', v_camila);

    -- Consentimiento informado
    insert into consents
      (org_id, patient_id, kind, accepted_text, version, accepted_by_patient, signed_by)
    values
      (v_org, v_patient, 'tratamiento_dental',
       'Autorizo el tratamiento odontológico propuesto por el equipo clínico, incluyendo la eventual aplicación de anestesia y la ejecución de los procedimientos explicados.',
       '1', true, v_camila);

    -- Atención firmada usando el trigger real (auth.uid() se simula con el claim)
    insert into encounters
      (org_id, patient_id, doctor_id, started_at, care_type, motivo, evolucion,
       diagnostico, indicaciones, proxima_cita_at, specialty_data, status)
    values
      (v_org, v_patient, v_camila, now() - interval '5 days', 'primera_consulta',
       'Dolor al masticar en sector inferior derecho.',
       'Al examen clínico se aprecia caries en pieza 46 y obturación con posible filtración en pieza 36. No hay edema ni movilidad dentaria.',
       'Caries proximal en pieza 46. Filtración marginal en obturaciones de pieza 36.',
       'Programar obturación en pieza 46 y control de la pieza 36. Analgesia si dolor.',
       now() + interval '5 days',
       jsonb_build_object('observations', 'Paciente será atendido por el equipo de operatoria.',
                          'procedures', jsonb_build_array('Obturación clase I')),
       'draft')
      returning id into v_enc;

    perform set_config('request.jwt.claim.sub', v_camila::text, true);
    update encounters
    set status = 'signed'
    where org_id = v_org and id = v_enc and status = 'draft';
    perform set_config('request.jwt.claim.sub', null, true);

    -- Borrador sin firmar (a cargo del otro profesional)
    insert into encounters
      (org_id, patient_id, doctor_id, started_at, care_type, motivo, evolucion,
       diagnostico, indicaciones, specialty_data, status)
    values
      (v_org, v_patient, v_seba, now() - interval '2 days', 'endodoncia',
       'Control post-operatorio de tratamiento de conductos.',
       '',
       '',
       '',
       '{}'::jsonb,
       'draft');
  end if;
end $$;