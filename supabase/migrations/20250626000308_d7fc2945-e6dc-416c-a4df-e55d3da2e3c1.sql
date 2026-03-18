
-- Enable RLS on payrolls table
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view payrolls from their company
CREATE POLICY "Users can view company payrolls" 
  ON public.payrolls 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  );

-- Create policy to allow users to insert payrolls for their company
CREATE POLICY "Users can insert company payrolls" 
  ON public.payrolls 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = public.get_current_user_company_id()
  );

-- Create policy to allow users to update payrolls from their company
CREATE POLICY "Users can update company payrolls" 
  ON public.payrolls 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
  );

-- Create policy to allow users to delete payrolls from their company
CREATE POLICY "Users can delete company payrolls" 
  ON public.payrolls 
  FOR DELETE 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  );

-- Also enable RLS and create policies for payroll_vouchers table
ALTER TABLE public.payroll_vouchers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view vouchers from their company
CREATE POLICY "Users can view company vouchers" 
  ON public.payroll_vouchers 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  );

-- Create policy to allow users to insert vouchers for their company
CREATE POLICY "Users can insert company vouchers" 
  ON public.payroll_vouchers 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = public.get_current_user_company_id()
  );

-- Create policy to allow users to update vouchers from their company
CREATE POLICY "Users can update company vouchers" 
  ON public.payroll_vouchers 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id = public.get_current_user_company_id()
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
  );
