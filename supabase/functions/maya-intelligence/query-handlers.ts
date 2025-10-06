// ============================================================================
// Query Handlers - Employee search and validation functions
// ============================================================================

/**
 * Search for employees by name
 */
export async function searchEmployee(supabase: any, name: string | null) {
  try {
    // Get current user's company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        message: 'No estás autenticado. Por favor inicia sesión.',
        emotionalState: 'confused'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return {
        message: 'No tienes una empresa asociada.',
        emotionalState: 'confused'
      };
    }

    // If no name provided, return list of all employees
    if (!name) {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });

      if (error) throw error;

      if (!employees || employees.length === 0) {
        return {
          message: 'No hay empleados registrados en tu empresa.',
          emotionalState: 'neutral'
        };
      }

      return {
        message: `Encontré ${employees.length} empleado${employees.length !== 1 ? 's' : ''} activo${employees.length !== 1 ? 's' : ''} en tu empresa.`,
        emotionalState: 'happy',
        data: employees
      };
    }

    // Search for employee by name (case-insensitive)
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('estado', 'activo')
      .ilike('nombre', `%${name}%`);

    if (error) throw error;

    if (!employees || employees.length === 0) {
      return {
        message: `No encontré ningún empleado llamado "${name}" en tu empresa. ¿Podrías verificar la ortografía?`,
        emotionalState: 'neutral'
      };
    }

    if (employees.length === 1) {
      const emp = employees[0];
      return {
        message: `Encontré a ${emp.nombre} ${emp.apellido} - ${emp.cargo || 'Sin cargo'} (${emp.email || 'Sin email'})`,
        emotionalState: 'happy',
        data: emp
      };
    }

    return {
      message: `Encontré ${employees.length} empleados que coinciden con "${name}":`,
      emotionalState: 'happy',
      data: employees
    };

  } catch (error) {
    console.error('[searchEmployee] Error:', error);
    return {
      message: 'Ocurrió un error buscando empleados.',
      emotionalState: 'confused'
    };
  }
}

/**
 * Validate if an employee exists
 */
export async function validateEmployeeExists(supabase: any, name: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { exists: false, message: 'Usuario no autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return { exists: false, message: 'Sin empresa asociada' };
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nombre, apellido')
      .eq('company_id', profile.company_id)
      .eq('estado', 'activo')
      .ilike('nombre', `%${name}%`);

    if (error) throw error;

    return {
      exists: employees && employees.length > 0,
      count: employees?.length || 0,
      employees: employees || []
    };

  } catch (error) {
    console.error('[validateEmployeeExists] Error:', error);
    return { exists: false, message: 'Error validando empleado' };
  }
}

/**
 * Get employee salary
 */
export async function getEmployeeSalary(supabase: any, name: string | null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        message: 'No estás autenticado.',
        emotionalState: 'confused'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return {
        message: 'No tienes empresa asociada.',
        emotionalState: 'confused'
      };
    }

    if (!name) {
      return {
        message: '¿De qué empleado quieres saber el salario?',
        emotionalState: 'neutral'
      };
    }

    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('estado', 'activo')
      .ilike('nombre', `%${name}%`);

    if (error) throw error;

    if (!employees || employees.length === 0) {
      return {
        message: `No encontré a "${name}".`,
        emotionalState: 'neutral'
      };
    }

    const emp = employees[0];
    const formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });

    return {
      message: `${emp.nombre} ${emp.apellido} tiene un salario base de ${formatter.format(emp.salario_base || 0)}`,
      emotionalState: 'happy',
      data: { salary: emp.salario_base, employee: emp }
    };

  } catch (error) {
    console.error('[getEmployeeSalary] Error:', error);
    return {
      message: 'Error obteniendo salario.',
      emotionalState: 'confused'
    };
  }
}

/**
 * Get employee paid total
 */
export async function getEmployeePaidTotal(supabase: any, params: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        message: 'No estás autenticado.',
        emotionalState: 'confused'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return {
        message: 'No tienes empresa asociada.',
        emotionalState: 'confused'
      };
    }

    const name = params?.name;
    if (!name) {
      return {
        message: '¿De qué empleado quieres saber el total pagado?',
        emotionalState: 'neutral'
      };
    }

    // Find employee
    const { data: employees } = await supabase
      .from('employees')
      .select('id, nombre, apellido')
      .eq('company_id', profile.company_id)
      .ilike('nombre', `%${name}%`);

    if (!employees || employees.length === 0) {
      return {
        message: `No encontré a "${name}".`,
        emotionalState: 'neutral'
      };
    }

    const emp = employees[0];

    // Get payroll records
    const { data: payrolls } = await supabase
      .from('payrolls')
      .select('total_pagado')
      .eq('company_id', profile.company_id)
      .eq('empleado_id', emp.id);

    const total = payrolls?.reduce((sum: number, p: any) => sum + (p.total_pagado || 0), 0) || 0;

    const formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });

    return {
      message: `El total pagado a ${emp.nombre} ${emp.apellido} es ${formatter.format(total)}`,
      emotionalState: 'happy',
      data: { total, employee: emp }
    };

  } catch (error) {
    console.error('[getEmployeePaidTotal] Error:', error);
    return {
      message: 'Error obteniendo total pagado.',
      emotionalState: 'confused'
    };
  }
}

/**
 * Get employee benefit provision
 */
export async function getEmployeeBenefitProvision(supabase: any, params: any) {
  try {
    return {
      message: 'Funcionalidad de provisión de prestaciones en desarrollo.',
      emotionalState: 'neutral'
    };
  } catch (error) {
    console.error('[getEmployeeBenefitProvision] Error:', error);
    return {
      message: 'Error obteniendo provisión.',
      emotionalState: 'confused'
    };
  }
}

/**
 * Get employee details
 */
export async function getEmployeeDetails(supabase: any, params: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        message: 'No estás autenticado.',
        emotionalState: 'confused'
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return {
        message: 'No tienes empresa asociada.',
        emotionalState: 'confused'
      };
    }

    const name = params?.name;
    if (!name) {
      return {
        message: '¿De qué empleado quieres ver los detalles?',
        emotionalState: 'neutral'
      };
    }

    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', profile.company_id)
      .ilike('nombre', `%${name}%`);

    if (!employees || employees.length === 0) {
      return {
        message: `No encontré a "${name}".`,
        emotionalState: 'neutral'
      };
    }

    const emp = employees[0];

    return {
      message: `Aquí están los detalles de ${emp.nombre} ${emp.apellido}`,
      emotionalState: 'happy',
      data: emp
    };

  } catch (error) {
    console.error('[getEmployeeDetails] Error:', error);
    return {
      message: 'Error obteniendo detalles.',
      emotionalState: 'confused'
    };
  }
}
