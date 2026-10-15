-- El catálogo lo administra el admin (policy dental_catalog_admin_manage ya es
-- FOR ALL), pero el grant nunca incluyó delete: el DELETE fallaba por permisos.
-- Los ítems del plan que referencien un tratamiento eliminado sobreviven
-- (treatment_id ... on delete set null).
grant delete on dental_treatments_catalog to authenticated;
