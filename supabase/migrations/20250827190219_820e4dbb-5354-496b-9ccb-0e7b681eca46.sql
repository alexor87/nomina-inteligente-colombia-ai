-- Verify and create RLS policies for payroll_periods_real and payrolls tables

-- Check if RLS is enabled on payroll_periods_real
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'payroll_periods_real' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE payroll_periods_real ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for payroll_periods_real';
    END IF;
END $$;

-- Check if RLS is enabled on payrolls
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'payrolls' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled for payrolls';
    END IF;
END $$;

-- Create RLS policies for payroll_periods_real if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payroll_periods_real' 
        AND policyname = 'Users can view company payroll periods'
    ) THEN
        CREATE POLICY "Users can view company payroll periods" ON payroll_periods_real
        FOR SELECT USING (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
        RAISE NOTICE 'Created SELECT policy for payroll_periods_real';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payroll_periods_real' 
        AND policyname = 'Users can insert company payroll periods'
    ) THEN
        CREATE POLICY "Users can insert company payroll periods" ON payroll_periods_real
        FOR INSERT WITH CHECK (
          company_id IN (
            SELECT company_id FROM profiles WHERE user_id = auth.uid()
          )
        );
        RAISE NOTICE 'Created INSERT policy for payroll_periods_real';
    END IF;
END $$;

-- Create RLS policies for payrolls if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payrolls' 
        AND policyname = 'Users can view company payrolls'
    ) THEN
        CREATE POLICY "Users can view company payrolls" ON payrolls
        FOR SELECT USING (
          period_id IN (
            SELECT id FROM payroll_periods_real 
            WHERE company_id IN (
              SELECT company_id FROM profiles WHERE user_id = auth.uid()
            )
          )
        );
        RAISE NOTICE 'Created SELECT policy for payrolls';
    END IF;
END $$;