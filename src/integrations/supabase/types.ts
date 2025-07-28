export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      afp_entities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      arl_entities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          code: string
          company_id: string
          created_at: string
          department: string | null
          id: string
          manager_name: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          code: string
          company_id: string
          created_at?: string
          department?: string | null
          id?: string
          manager_name?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          code?: string
          company_id?: string
          created_at?: string
          department?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          actividad_economica: string | null
          ciudad: string | null
          created_at: string
          direccion: string | null
          email: string
          estado: string | null
          id: string
          nit: string
          plan: string | null
          razon_social: string
          representante_legal: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          actividad_economica?: string | null
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          email: string
          estado?: string | null
          id?: string
          nit: string
          plan?: string | null
          razon_social: string
          representante_legal?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          actividad_economica?: string | null
          ciudad?: string | null
          created_at?: string
          direccion?: string | null
          email?: string
          estado?: string | null
          id?: string
          nit?: string
          plan?: string | null
          razon_social?: string
          representante_legal?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_field_definitions: {
        Row: {
          company_id: string
          created_at: string
          default_value: Json | null
          field_key: string
          field_label: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_value?: Json | null
          field_key: string
          field_label: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_value?: Json | null
          field_key?: string
          field_label?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_field_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payroll_configurations: {
        Row: {
          arl_risk_levels: Json
          company_id: string
          created_at: string
          fondo_solidaridad: Json
          id: string
          percentages: Json
          salary_min: number
          transport_allowance: number
          updated_at: string
          uvt: number
          year: string
        }
        Insert: {
          arl_risk_levels?: Json
          company_id: string
          created_at?: string
          fondo_solidaridad?: Json
          id?: string
          percentages?: Json
          salary_min?: number
          transport_allowance?: number
          updated_at?: string
          uvt?: number
          year: string
        }
        Update: {
          arl_risk_levels?: Json
          company_id?: string
          created_at?: string
          fondo_solidaridad?: Json
          id?: string
          percentages?: Json
          salary_min?: number
          transport_allowance?: number
          updated_at?: string
          uvt?: number
          year?: string
        }
        Relationships: []
      }
      company_schema_versions: {
        Row: {
          changes_summary: string
          company_id: string
          created_at: string
          created_by: string | null
          field_definitions: Json
          id: string
          version_number: number
        }
        Insert: {
          changes_summary: string
          company_id: string
          created_at?: string
          created_by?: string | null
          field_definitions: Json
          id?: string
          version_number: number
        }
        Update: {
          changes_summary?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          field_definitions?: Json
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_schema_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          custom_period_days: number | null
          id: string
          periodicity: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          custom_period_days?: number | null
          id?: string
          periodicity?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          custom_period_days?: number | null
          id?: string
          periodicity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          features: Json | null
          id: string
          max_employees: number | null
          max_payrolls_per_month: number | null
          plan_type: string | null
          status: string | null
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          features?: Json | null
          id?: string
          max_employees?: number | null
          max_payrolls_per_month?: number | null
          plan_type?: string | null
          status?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          features?: Json | null
          id?: string
          max_employees?: number | null
          max_payrolls_per_month?: number | null
          plan_type?: string | null
          status?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_funds: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          active: boolean
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_activity: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          type: string
          user_email: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          type: string
          user_email: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          type?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_alerts: {
        Row: {
          action_required: boolean | null
          company_id: string
          created_at: string
          description: string
          dismissed: boolean | null
          due_date: string | null
          icon: string | null
          id: string
          priority: string | null
          title: string
          type: string
        }
        Insert: {
          action_required?: boolean | null
          company_id: string
          created_at?: string
          description: string
          dismissed?: boolean | null
          due_date?: string | null
          icon?: string | null
          id?: string
          priority?: string | null
          title: string
          type: string
        }
        Update: {
          action_required?: boolean | null
          company_id?: string
          created_at?: string
          description?: string
          dismissed?: boolean | null
          due_date?: string | null
          icon?: string | null
          id?: string
          priority?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_imports: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_details: Json | null
          filename: string
          id: string
          invalid_rows: number
          mapping_config: Json | null
          status: string
          total_rows: number
          user_id: string
          valid_rows: number
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          filename: string
          id?: string
          invalid_rows?: number
          mapping_config?: Json | null
          status?: string
          total_rows?: number
          user_id: string
          valid_rows?: number
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          filename?: string
          id?: string
          invalid_rows?: number
          mapping_config?: Json | null
          status?: string
          total_rows?: number
          user_id?: string
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_note_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          note_id: string
          seen: boolean
          seen_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          note_id: string
          seen?: boolean
          seen_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          note_id?: string
          seen?: boolean
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "employee_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note_text: string
          period_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note_text: string
          period_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note_text?: string
          period_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods_real"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vacation_balances: {
        Row: {
          accumulated_days: number | null
          company_id: string
          created_at: string | null
          employee_id: string
          id: string
          initial_balance: number | null
          last_calculated: string | null
          updated_at: string | null
        }
        Insert: {
          accumulated_days?: number | null
          company_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          initial_balance?: number | null
          last_calculated?: string | null
          updated_at?: string | null
        }
        Update: {
          accumulated_days?: number | null
          company_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          initial_balance?: number | null
          last_calculated?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_vacation_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacation_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_vacation_periods: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          observations: string | null
          processed_in_period_id: string | null
          start_date: string
          status: string
          subtipo: string | null
          type: Database["public"]["Enums"]["novedad_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          observations?: string | null
          processed_in_period_id?: string | null
          start_date: string
          status?: string
          subtipo?: string | null
          type?: Database["public"]["Enums"]["novedad_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          observations?: string | null
          processed_in_period_id?: string | null
          start_date?: string
          status?: string
          subtipo?: string | null
          type?: Database["public"]["Enums"]["novedad_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_vacation_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacation_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_vacation_periods_processed_in_period_id_fkey"
            columns: ["processed_in_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods_real"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          afp: string | null
          apellido: string
          arl: string | null
          banco: string | null
          beneficios_extralegales: boolean | null
          caja_compensacion: string | null
          cargo: string | null
          cedula: string
          centro_costos: string | null
          ciudad: string | null
          clausulas_especiales: string | null
          codigo_ciiu: string | null
          company_id: string
          created_at: string
          custom_fields: Json | null
          departamento: string | null
          dias_trabajo: number | null
          direccion: string | null
          email: string | null
          eps: string | null
          estado: string | null
          estado_afiliacion: string | null
          fecha_finalizacion_contrato: string | null
          fecha_firma_contrato: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          forma_pago: string | null
          horas_trabajo: number | null
          id: string
          nivel_riesgo_arl: string | null
          nombre: string
          numero_cuenta: string | null
          periodicidad_pago: string | null
          regimen_salud: string | null
          salario_base: number
          segundo_nombre: string | null
          sexo: string | null
          subtipo_cotizante_id: string | null
          telefono: string | null
          tipo_contrato: string | null
          tipo_cotizante_id: string | null
          tipo_cuenta: string | null
          tipo_documento: string | null
          tipo_jornada: string | null
          titular_cuenta: string | null
          updated_at: string
        }
        Insert: {
          afp?: string | null
          apellido: string
          arl?: string | null
          banco?: string | null
          beneficios_extralegales?: boolean | null
          caja_compensacion?: string | null
          cargo?: string | null
          cedula: string
          centro_costos?: string | null
          ciudad?: string | null
          clausulas_especiales?: string | null
          codigo_ciiu?: string | null
          company_id: string
          created_at?: string
          custom_fields?: Json | null
          departamento?: string | null
          dias_trabajo?: number | null
          direccion?: string | null
          email?: string | null
          eps?: string | null
          estado?: string | null
          estado_afiliacion?: string | null
          fecha_finalizacion_contrato?: string | null
          fecha_firma_contrato?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          forma_pago?: string | null
          horas_trabajo?: number | null
          id?: string
          nivel_riesgo_arl?: string | null
          nombre: string
          numero_cuenta?: string | null
          periodicidad_pago?: string | null
          regimen_salud?: string | null
          salario_base?: number
          segundo_nombre?: string | null
          sexo?: string | null
          subtipo_cotizante_id?: string | null
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_cotizante_id?: string | null
          tipo_cuenta?: string | null
          tipo_documento?: string | null
          tipo_jornada?: string | null
          titular_cuenta?: string | null
          updated_at?: string
        }
        Update: {
          afp?: string | null
          apellido?: string
          arl?: string | null
          banco?: string | null
          beneficios_extralegales?: boolean | null
          caja_compensacion?: string | null
          cargo?: string | null
          cedula?: string
          centro_costos?: string | null
          ciudad?: string | null
          clausulas_especiales?: string | null
          codigo_ciiu?: string | null
          company_id?: string
          created_at?: string
          custom_fields?: Json | null
          departamento?: string | null
          dias_trabajo?: number | null
          direccion?: string | null
          email?: string | null
          eps?: string | null
          estado?: string | null
          estado_afiliacion?: string | null
          fecha_finalizacion_contrato?: string | null
          fecha_firma_contrato?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          forma_pago?: string | null
          horas_trabajo?: number | null
          id?: string
          nivel_riesgo_arl?: string | null
          nombre?: string
          numero_cuenta?: string | null
          periodicidad_pago?: string | null
          regimen_salud?: string | null
          salario_base?: number
          segundo_nombre?: string | null
          sexo?: string | null
          subtipo_cotizante_id?: string | null
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_cotizante_id?: string | null
          tipo_cuenta?: string | null
          tipo_documento?: string | null
          tipo_jornada?: string | null
          titular_cuenta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_subtipo_cotizante_id_fkey"
            columns: ["subtipo_cotizante_id"]
            isOneToOne: false
            referencedRelation: "subtipos_cotizante"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tipo_cotizante_id_fkey"
            columns: ["tipo_cotizante_id"]
            isOneToOne: false
            referencedRelation: "tipos_cotizante"
            referencedColumns: ["id"]
          },
        ]
      }
      eps_entities: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          amount: number
          concept: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          observations: string | null
          period_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          concept: string
          created_at?: string
          created_by: string
          employee_id: string
          id?: string
          observations?: string | null
          period_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          concept?: string
          created_at?: string
          created_by?: string
          employee_id?: string
          id?: string
          observations?: string | null
          period_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_novedades: {
        Row: {
          adjunto_url: string | null
          base_calculo: string | null
          company_id: string
          constitutivo_salario: boolean | null
          creado_por: string | null
          created_at: string
          dias: number | null
          empleado_id: string
          fecha_fin: string | null
          fecha_inicio: string | null
          horas: number | null
          id: string
          observacion: string | null
          periodo_id: string
          subtipo: string | null
          tipo_novedad: Database["public"]["Enums"]["novedad_type"]
          updated_at: string
          valor: number | null
        }
        Insert: {
          adjunto_url?: string | null
          base_calculo?: string | null
          company_id: string
          constitutivo_salario?: boolean | null
          creado_por?: string | null
          created_at?: string
          dias?: number | null
          empleado_id: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          horas?: number | null
          id?: string
          observacion?: string | null
          periodo_id: string
          subtipo?: string | null
          tipo_novedad: Database["public"]["Enums"]["novedad_type"]
          updated_at?: string
          valor?: number | null
        }
        Update: {
          adjunto_url?: string | null
          base_calculo?: string | null
          company_id?: string
          constitutivo_salario?: boolean | null
          creado_por?: string | null
          created_at?: string
          dias?: number | null
          empleado_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          horas?: number | null
          id?: string
          observacion?: string | null
          periodo_id?: string
          subtipo?: string | null
          tipo_novedad?: Database["public"]["Enums"]["novedad_type"]
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payroll_novedades_periodo_real"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods_real"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_novedades_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_novedades_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods_real"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_novedades_audit: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          new_values: Json | null
          novedad_id: string
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          novedad_id: string
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          novedad_id?: string
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      payroll_period_corrections: {
        Row: {
          affected_novedad_id: string | null
          company_id: string
          concept: string
          correction_type: string
          created_at: string
          created_by: string
          employee_id: string
          id: string
          justification: string
          new_value: number | null
          period_id: string
          previous_value: number | null
          updated_at: string
          value_difference: number
        }
        Insert: {
          affected_novedad_id?: string | null
          company_id: string
          concept: string
          correction_type: string
          created_at?: string
          created_by: string
          employee_id: string
          id?: string
          justification: string
          new_value?: number | null
          period_id: string
          previous_value?: number | null
          updated_at?: string
          value_difference: number
        }
        Update: {
          affected_novedad_id?: string | null
          company_id?: string
          concept?: string
          correction_type?: string
          created_at?: string
          created_by?: string
          employee_id?: string
          id?: string
          justification?: string
          new_value?: number | null
          period_id?: string
          previous_value?: number | null
          updated_at?: string
          value_difference?: number
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          company_id: string
          created_at: string
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          modificado_en: string | null
          modificado_por: string | null
          tipo_periodo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo_periodo?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          modificado_en?: string | null
          modificado_por?: string | null
          tipo_periodo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods_real: {
        Row: {
          company_id: string
          created_at: string
          empleados_count: number | null
          employees_loaded: boolean | null
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          last_activity_at: string | null
          numero_periodo_anual: number | null
          periodo: string
          tipo_periodo: string
          total_deducciones: number | null
          total_devengado: number | null
          total_neto: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          empleados_count?: number | null
          employees_loaded?: boolean | null
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          last_activity_at?: string | null
          numero_periodo_anual?: number | null
          periodo: string
          tipo_periodo?: string
          total_deducciones?: number | null
          total_devengado?: number | null
          total_neto?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          empleados_count?: number | null
          employees_loaded?: boolean | null
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          last_activity_at?: string | null
          numero_periodo_anual?: number | null
          periodo?: string
          tipo_periodo?: string
          total_deducciones?: number | null
          total_devengado?: number | null
          total_neto?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payroll_reopen_audit: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          has_vouchers: boolean | null
          id: string
          new_state: string | null
          notes: string | null
          periodo: string
          previous_state: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          has_vouchers?: boolean | null
          id?: string
          new_state?: string | null
          notes?: string | null
          periodo: string
          previous_state?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          has_vouchers?: boolean | null
          id?: string
          new_state?: string | null
          notes?: string | null
          periodo?: string
          previous_state?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_reopen_audit_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_sync_log: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          period_id: string
          records_created: number | null
          records_updated: number | null
          status: string
          sync_type: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          period_id: string
          records_created?: number | null
          records_updated?: number | null
          status?: string
          sync_type: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          period_id?: string
          records_created?: number | null
          records_updated?: number | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      payroll_vouchers: {
        Row: {
          company_id: string
          created_at: string
          dian_cufe: string | null
          dian_status: string | null
          electronic_signature_date: string | null
          employee_id: string
          end_date: string
          generated_by: string | null
          id: string
          net_pay: number
          payroll_id: string | null
          pdf_url: string | null
          periodo: string
          sent_date: string | null
          sent_to_employee: boolean | null
          start_date: string
          updated_at: string
          voucher_status: string | null
          xml_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          dian_cufe?: string | null
          dian_status?: string | null
          electronic_signature_date?: string | null
          employee_id: string
          end_date: string
          generated_by?: string | null
          id?: string
          net_pay?: number
          payroll_id?: string | null
          pdf_url?: string | null
          periodo: string
          sent_date?: string | null
          sent_to_employee?: boolean | null
          start_date: string
          updated_at?: string
          voucher_status?: string | null
          xml_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          dian_cufe?: string | null
          dian_status?: string | null
          electronic_signature_date?: string | null
          employee_id?: string
          end_date?: string
          generated_by?: string | null
          id?: string
          net_pay?: number
          payroll_id?: string | null
          pdf_url?: string | null
          periodo?: string
          sent_date?: string | null
          sent_to_employee?: boolean | null
          start_date?: string
          updated_at?: string
          voucher_status?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_vouchers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_vouchers_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
        ]
      }
      payrolls: {
        Row: {
          auxilio_transporte: number | null
          bonificaciones: number | null
          bonificaciones_adicionales: number | null
          cesantias: number | null
          comisiones: number | null
          company_id: string
          created_at: string
          descuentos_varios: number | null
          dias_trabajados: number | null
          editable: boolean | null
          embargos: number | null
          employee_id: string
          estado: string | null
          fecha_reapertura: string | null
          fondo_solidaridad: number | null
          horas_extra: number | null
          horas_extra_diurnas: number | null
          horas_extra_nocturnas: number | null
          id: string
          incapacidades: number | null
          intereses_cesantias: number | null
          licencias_remuneradas: number | null
          neto_pagado: number | null
          otras_deducciones: number | null
          otros_descuentos: number | null
          otros_devengos: number | null
          pension_empleado: number | null
          period_id: string | null
          periodo: string
          prestamos: number | null
          prima: number | null
          reabierto_por: string | null
          recargo_dominical: number | null
          recargo_nocturno: number | null
          reportado_dian: boolean | null
          retencion_fuente: number | null
          salario_base: number
          salud_empleado: number | null
          total_deducciones: number | null
          total_devengado: number | null
          updated_at: string
          vacaciones: number | null
        }
        Insert: {
          auxilio_transporte?: number | null
          bonificaciones?: number | null
          bonificaciones_adicionales?: number | null
          cesantias?: number | null
          comisiones?: number | null
          company_id: string
          created_at?: string
          descuentos_varios?: number | null
          dias_trabajados?: number | null
          editable?: boolean | null
          embargos?: number | null
          employee_id: string
          estado?: string | null
          fecha_reapertura?: string | null
          fondo_solidaridad?: number | null
          horas_extra?: number | null
          horas_extra_diurnas?: number | null
          horas_extra_nocturnas?: number | null
          id?: string
          incapacidades?: number | null
          intereses_cesantias?: number | null
          licencias_remuneradas?: number | null
          neto_pagado?: number | null
          otras_deducciones?: number | null
          otros_descuentos?: number | null
          otros_devengos?: number | null
          pension_empleado?: number | null
          period_id?: string | null
          periodo: string
          prestamos?: number | null
          prima?: number | null
          reabierto_por?: string | null
          recargo_dominical?: number | null
          recargo_nocturno?: number | null
          reportado_dian?: boolean | null
          retencion_fuente?: number | null
          salario_base?: number
          salud_empleado?: number | null
          total_deducciones?: number | null
          total_devengado?: number | null
          updated_at?: string
          vacaciones?: number | null
        }
        Update: {
          auxilio_transporte?: number | null
          bonificaciones?: number | null
          bonificaciones_adicionales?: number | null
          cesantias?: number | null
          comisiones?: number | null
          company_id?: string
          created_at?: string
          descuentos_varios?: number | null
          dias_trabajados?: number | null
          editable?: boolean | null
          embargos?: number | null
          employee_id?: string
          estado?: string | null
          fecha_reapertura?: string | null
          fondo_solidaridad?: number | null
          horas_extra?: number | null
          horas_extra_diurnas?: number | null
          horas_extra_nocturnas?: number | null
          id?: string
          incapacidades?: number | null
          intereses_cesantias?: number | null
          licencias_remuneradas?: number | null
          neto_pagado?: number | null
          otras_deducciones?: number | null
          otros_descuentos?: number | null
          otros_devengos?: number | null
          pension_empleado?: number | null
          period_id?: string | null
          periodo?: string
          prestamos?: number | null
          prima?: number | null
          reabierto_por?: string | null
          recargo_dominical?: number | null
          recargo_nocturno?: number | null
          reportado_dian?: boolean | null
          retencion_fuente?: number | null
          salario_base?: number
          salud_empleado?: number | null
          total_deducciones?: number | null
          total_devengado?: number | null
          updated_at?: string
          vacaciones?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods_real"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action: string
          additional_data: Json | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          query_attempted: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
          violation_type: string
        }
        Insert: {
          action: string
          additional_data?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          query_attempted?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
          violation_type: string
        }
        Update: {
          action?: string
          additional_data?: Json | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          query_attempted?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      subtipos_cotizante: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tipo_cotizante_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tipo_cotizante_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo_cotizante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtipos_cotizante_tipo_cotizante_id_fkey"
            columns: ["tipo_cotizante_id"]
            isOneToOne: false
            referencedRelation: "tipos_cotizante"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_cotizante: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          read: boolean
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          company_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          company_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_audit_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string | null
          recipient_email: string | null
          recipient_phone: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_audit_log_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "payroll_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_period_intersection_days: {
        Args: {
          absence_start: string
          absence_end: string
          period_start: string
          period_end: string
        }
        Returns: number
      }
      calculate_worked_days_for_period: {
        Args: {
          p_tipo_periodo: string
          p_fecha_inicio: string
          p_fecha_fin: string
        }
        Returns: number
      }
      can_manage_company_users: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
      clean_abandoned_draft_periods: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      clean_duplicate_periods: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      clean_specific_duplicate_periods: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      complete_incomplete_registration: {
        Args: { p_user_email: string; p_company_name?: string; p_nit?: string }
        Returns: Json
      }
      create_company_with_setup: {
        Args: {
          p_nit: string
          p_razon_social: string
          p_email: string
          p_telefono?: string
          p_ciudad?: string
          p_plan?: string
          p_user_email?: string
          p_user_password?: string
          p_first_name?: string
          p_last_name?: string
        }
        Returns: string
      }
      create_payroll_adjustment: {
        Args: {
          p_period_id: string
          p_employee_id: string
          p_concept: string
          p_amount: number
          p_observations: string
          p_created_by: string
        }
        Returns: undefined
      }
      detect_current_smart_period: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      detect_smart_current_period: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      diagnose_duplicate_periods: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      ensure_admin_role_for_company_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_malformed_fragmented_absences: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      force_sync_existing_novedades: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_payroll_records_for_period: {
        Args: { p_period_id: string }
        Returns: Json
      }
      get_active_period_for_company: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      get_company_active_field_definitions: {
        Args: { p_company_id: string }
        Returns: {
          id: string
          field_key: string
          field_label: string
          field_type: string
          field_options: Json
          is_required: boolean
          default_value: Json
          sort_order: number
        }[]
      }
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_novedad_audit_history: {
        Args: { p_novedad_id: string }
        Returns: {
          action: string
          old_values: Json
          new_values: Json
          user_email: string
          created_at: string
        }[]
      }
      get_payroll_history_periods: {
        Args: { p_company_id?: string }
        Returns: Json
      }
      get_period_adjustments: {
        Args: { p_period_id: string }
        Returns: {
          id: string
          employee_name: string
          concept: string
          amount: number
          observations: string
          novedad_type: string
          created_by_email: string
          created_at: string
        }[]
      }
      get_period_audit_summary: {
        Args: { p_period_id: string }
        Returns: {
          employee_name: string
          novedad_type: string
          action: string
          value_change: number
          user_email: string
          created_at: string
        }[]
      }
      get_user_companies_simple: {
        Args: { _user_id?: string }
        Returns: {
          company_id: string
          role_name: string
        }[]
      }
      get_user_role_in_company: {
        Args: { _user_id: string; _company_id: string }
        Returns: string
      }
      has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _company_id?: string
        }
        Returns: boolean
      }
      has_role_in_company: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _company_id: string
        }
        Returns: boolean
      }
      is_support_user: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      log_security_violation: {
        Args: {
          p_table_name: string
          p_action: string
          p_violation_type: string
          p_query_attempted?: string
          p_additional_data?: Json
        }
        Returns: undefined
      }
      normalize_biweekly_period_labels: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      sync_existing_vacation_data: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_historical_payroll_data: {
        Args: { p_period_id: string; p_company_id?: string }
        Returns: Json
      }
      sync_payroll_periods: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_has_access_to_company: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrador"
        | "rrhh"
        | "contador"
        | "visualizador"
        | "soporte"
      novedad_type:
        | "horas_extra"
        | "recargo_nocturno"
        | "vacaciones"
        | "licencia_remunerada"
        | "incapacidad"
        | "bonificacion"
        | "comision"
        | "prima"
        | "otros_ingresos"
        | "salud"
        | "pension"
        | "fondo_solidaridad"
        | "retencion_fuente"
        | "libranza"
        | "ausencia"
        | "multa"
        | "descuento_voluntario"
        | "licencia_no_remunerada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "administrador",
        "rrhh",
        "contador",
        "visualizador",
        "soporte",
      ],
      novedad_type: [
        "horas_extra",
        "recargo_nocturno",
        "vacaciones",
        "licencia_remunerada",
        "incapacidad",
        "bonificacion",
        "comision",
        "prima",
        "otros_ingresos",
        "salud",
        "pension",
        "fondo_solidaridad",
        "retencion_fuente",
        "libranza",
        "ausencia",
        "multa",
        "descuento_voluntario",
        "licencia_no_remunerada",
      ],
    },
  },
} as const
