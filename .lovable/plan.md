

## Phase 2: Data Exports, Global Settings, Advanced Metrics

### 1. Database Migration — `system_settings` table

New table to store global configuration:
```sql
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
```
RLS: only superadmins can read/write. Seed with default values: `default_trial_days` (14), `feature_flags` ({}), `platform_name`, `support_email`.

### 2. Admin Settings Page — `/admin/settings`

New file: `src/pages/admin/AdminSettingsPage.tsx`
- Form with editable key-value settings loaded from `system_settings`
- Sections: Trial Config (default days), Platform Info (name, support email), Feature Flags (toggle switches)
- Save updates via upsert to `system_settings`

### 3. Data Export Feature

Add export methods to `SuperAdminService`:
- `exportCompaniesToExcel(companies)` — uses existing `xlsx` library
- `exportSubscriptionEventsToExcel(events)`
- `exportDashboardMetricsToExcel(metrics)`

Add export buttons to:
- **AdminCompaniesPage**: "Exportar" button above the table
- **AdminDashboardPage**: "Exportar Métricas" button in header
- **AdminSubscriptionsPage**: "Exportar Eventos" button

### 4. Advanced Dashboard Metrics

Extend `SaaSMetrics` interface and `getDashboardMetrics()` to calculate:
- **Churn Rate**: companies that went from `activa` to `suspendida` in last 30 days / total active
- **ARPU**: MRR / active companies
- **Trial-to-Paid Conversion**: companies with status `activa` that had a previous `trial` event / total trials ever
- **Revenue per Plan**: breakdown of MRR by plan type (already have `activePlanTypes`)

New KPI cards row + a revenue-per-plan bar chart on `AdminDashboardPage`.

### 5. Routing & Navigation

- Add `Settings` nav item to `AdminLayout` sidebar with `Settings` icon
- Add route `/admin/settings` to `App.tsx`
- Lazy-load `AdminSettingsPage`

### Files to create
- `src/pages/admin/AdminSettingsPage.tsx`

### Files to modify
- `src/services/SuperAdminService.ts` — add export helpers + advanced metrics
- `src/pages/admin/AdminDashboardPage.tsx` — new KPI cards (churn, ARPU, conversion) + revenue chart + export button
- `src/pages/admin/AdminCompaniesPage.tsx` — export button
- `src/pages/admin/AdminSubscriptionsPage.tsx` — export button
- `src/components/admin/AdminLayout.tsx` — add Settings nav
- `src/App.tsx` — add settings route
- **DB migration**: create `system_settings` table with RLS + seed data

