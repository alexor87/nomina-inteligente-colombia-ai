import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RollbackRequest {
  versionId: string;
  periodId: string;
  justification: string;
  targetSnapshot: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { versionId, periodId, justification, targetSnapshot }: RollbackRequest = await req.json()

    console.log(`🔄 Starting rollback to version ${versionId} for period ${periodId}`)

    // Validate user has access to this period
    const { data: period, error: periodError } = await supabaseClient
      .from('payroll_periods_real')
      .select('company_id, estado, periodo')
      .eq('id', periodId)
      .single()

    if (periodError || !period) {
      return new Response(
        JSON.stringify({ error: 'Period not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access to this company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.company_id !== period.company_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify period is closed
    if (period.estado !== 'cerrado') {
      return new Response(
        JSON.stringify({ error: 'Only closed periods can be restored' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Begin transaction-like operation
    console.log('📝 Creating rollback audit log...')
    
    // Create audit log entry
    await supabaseClient.from('security_audit_log').insert({
      company_id: period.company_id,
      user_id: user.id,
      table_name: 'payroll_periods_real',
      action: 'ROLLBACK_INITIATED',
      violation_type: 'payroll_rollback',
      query_attempted: `Rollback to version ${versionId}`,
      additional_data: {
        period_id: periodId,
        version_id: versionId,
        justification,
        periodo: period.periodo,
        timestamp: new Date().toISOString()
      }
    })

    try {
      // Step 1: Delete current payroll records
      console.log('🗑️ Deleting current payroll records...')
      const { error: deleteError } = await supabaseClient
        .from('payrolls')
        .delete()
        .eq('period_id', periodId)

      if (deleteError) {
        throw new Error(`Failed to delete current payrolls: ${deleteError.message}`)
      }

      // Step 2: Delete current novedades
      console.log('🗑️ Deleting current novedades...')
      const { error: deleteNovedadesError } = await supabaseClient
        .from('payroll_novedades')
        .delete()
        .eq('periodo_id', periodId)

      if (deleteNovedadesError) {
        throw new Error(`Failed to delete current novedades: ${deleteNovedadesError.message}`)
      }

      // Step 3: Restore payroll records from snapshot
      if (targetSnapshot.payrolls && targetSnapshot.payrolls.length > 0) {
        console.log(`🔄 Restoring ${targetSnapshot.payrolls.length} payroll records...`)
        
        const payrollsToInsert = targetSnapshot.payrolls.map((payroll: any) => ({
          ...payroll,
          id: undefined, // Let database generate new IDs
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: insertPayrollsError } = await supabaseClient
          .from('payrolls')
          .insert(payrollsToInsert)

        if (insertPayrollsError) {
          throw new Error(`Failed to restore payrolls: ${insertPayrollsError.message}`)
        }
      }

      // Step 4: Restore novedades from snapshot
      if (targetSnapshot.novedades && targetSnapshot.novedades.length > 0) {
        console.log(`🔄 Restoring ${targetSnapshot.novedades.length} novedades...`)
        
        const novedadesToInsert = targetSnapshot.novedades.map((novedad: any) => ({
          ...novedad,
          id: undefined, // Let database generate new IDs
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: insertNovedadesError } = await supabaseClient
          .from('payroll_novedades')
          .insert(novedadesToInsert)

        if (insertNovedadesError) {
          throw new Error(`Failed to restore novedades: ${insertNovedadesError.message}`)
        }
      }

      // Step 5: Update period totals
      console.log('📊 Updating period totals...')
      const { error: updatePeriodError } = await supabaseClient
        .from('payroll_periods_real')
        .update({
          empleados_count: targetSnapshot.empleados_count || 0,
          total_devengado: targetSnapshot.total_devengado || 0,
          total_deducciones: targetSnapshot.total_deducciones || 0,
          total_neto: targetSnapshot.total_neto || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', periodId)

      if (updatePeriodError) {
        throw new Error(`Failed to update period totals: ${updatePeriodError.message}`)
      }

      // Step 6: Create new version entry for the rollback
      console.log('📝 Creating rollback version entry...')
      
      // Get current highest version number
      const { data: versions } = await supabaseClient
        .from('payroll_version_history')
        .select('version_number')
        .eq('period_id', periodId)
        .order('version_number', { ascending: false })
        .limit(1)

      const nextVersion = (versions?.[0]?.version_number || 0) + 1

      const { error: versionError } = await supabaseClient
        .from('payroll_version_history')
        .insert({
          company_id: period.company_id,
          period_id: periodId,
          version_number: nextVersion,
          snapshot_data: targetSnapshot,
          changes_summary: `Rollback to version from ${versionId}. Justification: ${justification}`,
          version_type: 'rollback',
          previous_version_id: versionId,
          created_by: user.id
        })

      if (versionError) {
        console.warn('⚠️ Could not create version entry:', versionError)
      }

      // Final audit log
      await supabaseClient.from('security_audit_log').insert({
        company_id: period.company_id,
        user_id: user.id,
        table_name: 'payroll_periods_real',
        action: 'ROLLBACK_SUCCESS',
        violation_type: 'payroll_rollback',
        query_attempted: `Rollback completed to version ${versionId}`,
        additional_data: {
          period_id: periodId,
          version_id: versionId,
          justification,
          new_version: nextVersion,
          timestamp: new Date().toISOString()
        }
      })

      console.log('✅ Rollback completed successfully')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Rollback executed successfully',
          newVersion: nextVersion
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (operationError) {
      // Log the failure
      await supabaseClient.from('security_audit_log').insert({
        company_id: period.company_id,
        user_id: user.id,
        table_name: 'payroll_periods_real',
        action: 'ROLLBACK_FAILED',
        violation_type: 'payroll_rollback',
        query_attempted: `Rollback failed for version ${versionId}`,
        additional_data: {
          period_id: periodId,
          version_id: versionId,
          justification,
          error: operationError instanceof Error ? operationError.message : String(operationError),
          timestamp: new Date().toISOString()
        }
      })

      throw operationError
    }

  } catch (error) {
    console.error('❌ Rollback error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Rollback failed', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})