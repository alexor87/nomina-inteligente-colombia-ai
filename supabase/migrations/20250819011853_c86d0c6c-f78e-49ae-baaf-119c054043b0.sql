
-- Añadir 'vacaciones' al enum social_benefit_type si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'social_benefit_type'
      AND e.enumlabel = 'vacaciones'
  ) THEN
    ALTER TYPE social_benefit_type ADD VALUE 'vacaciones';
  END IF;
END
$$;
