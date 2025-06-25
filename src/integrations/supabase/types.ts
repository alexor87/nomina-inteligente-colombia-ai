export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
      company_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          periodicity: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          periodicity?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
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
      employees: {
        Row: {
          afp: string | null
          apellido: string
          arl: string | null
          banco: string | null
          caja_compensacion: string | null
          cargo: string | null
          cedula: string
          company_id: string
          created_at: string
          email: string | null
          eps: string | null
          estado: string | null
          estado_afiliacion: string | null
          fecha_ingreso: string
          id: string
          nombre: string
          numero_cuenta: string | null
          salario_base: number
          telefono: string | null
          tipo_contrato: string | null
          tipo_cuenta: string | null
          tipo_documento: string | null
          titular_cuenta: string | null
          updated_at: string
        }
        Insert: {
          afp?: string | null
          apellido: string
          arl?: string | null
          banco?: string | null
          caja_compensacion?: string | null
          cargo?: string | null
          cedula: string
          company_id: string
          created_at?: string
          email?: string | null
          eps?: string | null
          estado?: string | null
          estado_afiliacion?: string | null
          fecha_ingreso?: string
          id?: string
          nombre: string
          numero_cuenta?: string | null
          salario_base?: number
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_cuenta?: string | null
          tipo_documento?: string | null
          titular_cuenta?: string | null
          updated_at?: string
        }
        Update: {
          afp?: string | null
          apellido?: string
          arl?: string | null
          banco?: string | null
          caja_compensacion?: string | null
          cargo?: string | null
          cedula?: string
          company_id?: string
          created_at?: string
          email?: string | null
          eps?: string | null
          estado?: string | null
          estado_afiliacion?: string | null
          fecha_ingreso?: string
          id?: string
          nombre?: string
          numero_cuenta?: string | null
          salario_base?: number
          telefono?: string | null
          tipo_contrato?: string | null
          tipo_cuenta?: string | null
          tipo_documento?: string | null
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
        ]
      }
      payroll_novedades: {
        Row: {
          adjunto_url: string | null
          base_calculo: string | null
          company_id: string
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
            referencedRelation: "payroll_periods"
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
          cesantias: number | null
          company_id: string
          created_at: string
          dias_trabajados: number | null
          employee_id: string
          estado: string | null
          horas_extra: number | null
          id: string
          intereses_cesantias: number | null
          neto_pagado: number | null
          otras_deducciones: number | null
          pension_empleado: number | null
          periodo: string
          prima: number | null
          recargo_dominical: number | null
          recargo_nocturno: number | null
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
          cesantias?: number | null
          company_id: string
          created_at?: string
          dias_trabajados?: number | null
          employee_id: string
          estado?: string | null
          horas_extra?: number | null
          id?: string
          intereses_cesantias?: number | null
          neto_pagado?: number | null
          otras_deducciones?: number | null
          pension_empleado?: number | null
          periodo: string
          prima?: number | null
          recargo_dominical?: number | null
          recargo_nocturno?: number | null
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
          cesantias?: number | null
          company_id?: string
          created_at?: string
          dias_trabajados?: number | null
          employee_id?: string
          estado?: string | null
          horas_extra?: number | null
          id?: string
          intereses_cesantias?: number | null
          neto_pagado?: number | null
          otras_deducciones?: number | null
          pension_empleado?: number | null
          periodo?: string
          prima?: number | null
          recargo_dominical?: number | null
          recargo_nocturno?: number | null
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
      usuarios_empresa: {
        Row: {
          activo: boolean
          asignado_en: string
          asignado_por: string | null
          empresa_id: string
          id: string
          rol: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          asignado_en?: string
          asignado_por?: string | null
          empresa_id: string
          id?: string
          rol: string
          usuario_id: string
        }
        Update: {
          activo?: boolean
          asignado_en?: string
          asignado_por?: string | null
          empresa_id?: string
          id?: string
          rol?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
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
      can_manage_company_users: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
      create_company_with_setup: {
        Args:
          | {
              p_nit: string
              p_razon_social: string
              p_email: string
              p_telefono?: string
              p_ciudad?: string
              p_plan?: string
            }
          | {
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
      ensure_admin_role_for_company_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_companies: {
        Args: { _user_id?: string }
        Returns: {
          company_id: string
          rol: string
        }[]
      }
      get_user_highest_role: {
        Args: { _company_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role_in_company: {
        Args: { _user_id: string; _company_id: string }
        Returns: string
      }
      get_user_roles: {
        Args: { _company_id?: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          company_id: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _company_id?: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _user_id: string; _company_id: string }
        Returns: boolean
      }
      is_saas_admin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      is_superadmin: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      user_has_access_to_company: {
        Args: { _user_id: string; _company_id: string }
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
      ],
    },
  },
} as const
