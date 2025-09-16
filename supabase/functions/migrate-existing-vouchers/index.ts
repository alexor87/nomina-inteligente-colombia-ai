import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface MigrationRequest {
  companyId?: string;
  batchSize?: number;
  dryRun?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      companyId,
      batchSize = 10,
      dryRun = false
    }: MigrationRequest = await req.json();

    console.log(`🔄 Starting voucher migration - Company: ${companyId || 'ALL'}, Batch: ${batchSize}, DryRun: ${dryRun}`);

    // Build query for vouchers without PDFs
    let query = supabase
      .from('payroll_vouchers')
      .select(`
        *,
        employees!inner(company_id, nombre, apellido, cedula, salario_base)
      `)
      .is('pdf_url', null);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: vouchersToMigrate, error: queryError } = await query
      .limit(batchSize);

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!vouchersToMigrate || vouchersToMigrate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No vouchers found without PDFs',
          processed: 0,
          errors: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`📋 Found ${vouchersToMigrate.length} vouchers to migrate`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `DRY RUN: Would process ${vouchersToMigrate.length} vouchers`,
          voucherIds: vouchersToMigrate.map(v => v.id),
          processed: 0,
          errors: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const results = {
      processed: 0,
      errors: [] as string[]
    };

    // Process vouchers one by one to avoid overwhelming the system
    for (const voucher of vouchersToMigrate) {
      try {
        console.log(`📄 Processing voucher ${voucher.id} for employee ${voucher.employee_id}`);

        // Call the PDF generation function
        const pdfResult = await supabase.functions.invoke('generate-voucher-pdf', {
          body: {
            voucherId: voucher.id,
            employeeId: voucher.employee_id,
            companyId: voucher.company_id,
            startDate: voucher.start_date,
            endDate: voucher.end_date,
            storeInStorage: true
          }
        });

        if (pdfResult.error) {
          throw new Error(`PDF generation failed: ${pdfResult.error.message}`);
        }

        results.processed++;
        console.log(`✅ Successfully migrated voucher ${voucher.id}`);

        // Add small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const errorMsg = `Failed to migrate voucher ${voucher.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);

        // Update voucher to track failed attempt
        await supabase
          .from('payroll_vouchers')
          .update({
            generation_attempts: (voucher.generation_attempts || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', voucher.id);
      }
    }

    console.log(`🏁 Migration completed: ${results.processed} processed, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed: ${results.processed}/${vouchersToMigrate.length} processed successfully`,
        ...results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Error in migrate-existing-vouchers:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processed: 0,
        errors: [error.message]
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});