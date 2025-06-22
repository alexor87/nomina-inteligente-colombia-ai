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
      employees: {
        Row: {
          afp: string | null
          apellido: string
          arl: string | null
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
          salario_base: number
          telefono: string | null
          tipo_contrato: string | null
          updated_at: string
        }
        Insert: {
          afp?: string | null
          apellido: string
          arl?: string | null
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
          salario_base?: number
          telefono?: string | null
          tipo_contrato?: string | null
          updated_at?: string
        }
        Update: {
          afp?: string | null
          apellido?: string
          arl?: string | null
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
          salario_base?: number
          telefono?: string | null
          tipo_contrato?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
