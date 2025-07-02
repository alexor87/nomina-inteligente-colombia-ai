
-- Add DELETE policy for payroll_periods_real table to allow cleanup
CREATE POLICY "Users can delete their company payroll periods" 
ON payroll_periods_real 
FOR DELETE 
USING (company_id = get_current_user_company_id());
