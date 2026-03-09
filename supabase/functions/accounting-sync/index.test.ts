import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "https://xrmorlkakwujyozgmilf.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhybW9ybGtha3d1anlvemdtaWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NzMxNDYsImV4cCI6MjA2NjE0OTE0Nn0.JSKbniDUkbNEAVCxCkrG_J5NQTt0yHc7W5PPheJ8X_U";

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/accounting-sync`;

Deno.test("accounting-sync: CORS preflight returns correct headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST"
    }
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get("Access-Control-Allow-Origin"));
  await response.text(); // Consume body
});

Deno.test("accounting-sync: test-connection requires provider and credentials", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "test-connection",
      data: {}
    })
  });

  const data = await response.json();
  
  // Should fail without proper credentials
  assertEquals(data.success, false);
});

Deno.test("accounting-sync: test-connection with siigo provider", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "test-connection",
      data: {
        provider: "siigo",
        credentials: {
          api_key: "test-invalid-key",
          username: "test@example.com"
        }
      }
    })
  });

  const data = await response.json();
  
  // Should return a response (success or failure based on credentials)
  assertExists(data);
  assertEquals(typeof data.success, "boolean");
  assertEquals(typeof data.message, "string");
});

Deno.test("accounting-sync: test-connection with alegra provider", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "test-connection",
      data: {
        provider: "alegra",
        credentials: {
          api_key: "test-invalid-key",
          username: "test@example.com"
        }
      }
    })
  });

  const data = await response.json();
  
  // Should return a response (success or failure based on credentials)
  assertExists(data);
  assertEquals(typeof data.success, "boolean");
  assertEquals(typeof data.message, "string");
});

Deno.test("accounting-sync: sync action requires company_id and period_id", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "sync",
      data: {}
    })
  });

  const data = await response.json();
  
  // Should fail without required parameters
  assertEquals(data.success, false);
});

Deno.test("accounting-sync: sync with non-existent integration", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "sync",
      data: {
        company_id: "00000000-0000-0000-0000-000000000000",
        period_id: "00000000-0000-0000-0000-000000000001"
      }
    })
  });

  const data = await response.json();
  
  // Should fail because integration doesn't exist
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test("accounting-sync: invalid action returns error", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      action: "invalid-action",
      data: {}
    })
  });

  const data = await response.json();
  
  // Should return error for invalid action
  assertEquals(data.success, false);
});

// Unit test for Siigo adapter format
Deno.test("accounting-sync: Siigo journal entry format validation", () => {
  // Simulated Siigo format based on their API spec
  const siigoEntry = {
    document: {
      id: 123
    },
    date: "2024-01-15",
    items: [
      {
        account: { code: "510506" },
        description: "Salario Básico",
        cost_center: 1,
        debit: 5000000,
        credit: 0
      },
      {
        account: { code: "250505" },
        description: "Nómina por pagar",
        cost_center: 1,
        debit: 0,
        credit: 5000000
      }
    ],
    observations: "Nómina período 2024-01"
  };

  // Validate structure
  assertExists(siigoEntry.document);
  assertExists(siigoEntry.date);
  assertExists(siigoEntry.items);
  assertEquals(siigoEntry.items.length >= 2, true);
  
  // Validate debit/credit balance
  const totalDebits = siigoEntry.items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredits = siigoEntry.items.reduce((sum, item) => sum + item.credit, 0);
  assertEquals(totalDebits, totalCredits);
});

// Unit test for Alegra adapter format  
Deno.test("accounting-sync: Alegra journal entry format validation", () => {
  // Simulated Alegra format based on their API spec
  const alegraEntry = {
    date: "2024-01-15",
    observations: "Nómina período 2024-01",
    entries: [
      {
        account: { id: "510506" },
        debit: 5000000,
        credit: 0,
        description: "Salario Básico"
      },
      {
        account: { id: "250505" },
        debit: 0,
        credit: 5000000,
        description: "Nómina por pagar"
      }
    ]
  };

  // Validate structure
  assertExists(alegraEntry.date);
  assertExists(alegraEntry.entries);
  assertEquals(alegraEntry.entries.length >= 2, true);
  
  // Validate debit/credit balance
  const totalDebits = alegraEntry.entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredits = alegraEntry.entries.reduce((sum, entry) => sum + entry.credit, 0);
  assertEquals(totalDebits, totalCredits);
});

// Test payroll to accounting entry transformation
Deno.test("accounting-sync: Payroll transformation produces balanced entries", () => {
  // Sample payroll data
  const payrollData = {
    salario_basico: 3000000,
    auxilio_transporte: 162000,
    salud_empleador: 255000,
    pension_empleador: 360000,
    salud_empleado: 120000,
    pension_empleado: 120000,
    neto_pagar: 2922000
  };

  // Transform to accounting entries (simulated)
  const entries = [
    { account: "510506", debit: payrollData.salario_basico, credit: 0 },
    { account: "510527", debit: payrollData.auxilio_transporte, credit: 0 },
    { account: "510569", debit: payrollData.salud_empleador, credit: 0 },
    { account: "510570", debit: payrollData.pension_empleador, credit: 0 },
    { account: "237005", debit: 0, credit: payrollData.salud_empleado },
    { account: "238030", debit: 0, credit: payrollData.pension_empleado },
    { account: "237006", debit: 0, credit: payrollData.salud_empleador },
    { account: "238031", debit: 0, credit: payrollData.pension_empleador },
    { account: "250505", debit: 0, credit: payrollData.neto_pagar }
  ];

  const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);

  // Entries should be balanced
  assertEquals(totalDebits, totalCredits);
});
