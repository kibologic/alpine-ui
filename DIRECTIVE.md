# Alpine UI — Component Library

## Purpose
Standalone component library for SwissJS apps. MIT licensed.
Built for data-heavy business applications.
Class prefix: .aui-

## Package
@alpine/ui — kibologic/alpine-ui

## Components
### Data
- DataTable.uix — sort, search, bulk select, pagination, export
- DataImport.uix — xlsx/csv upload → preview → validate → confirm
- DataExport.uix — SheetJS xlsx download

### Form
- TextField.uix — input with label, validation, prefix/suffix
- CurrencyField.uix — currency formatting
- DateField.uix — DD/MM/YYYY format
- SelectField.uix — searchable dropdown
- FormGroup.uix — label + field + error wrapper

### Feedback
- Modal.uix — sm/md/lg/fullscreen, draggable support (CG-08)
- Toast.uix — success/error/warning/info
- EmptyState.uix — no data, offline, empty states

### Layout
- PageHeader.uix — title + breadcrumb + actions
- Section.uix — card wrapper

## Open Issues
- CG-08: Draggable modal — document.addEventListener in mounted() needs compiler verification
- Modal close/X/ESC — fix pending Phase 1
- Form onchange handlers — fix pending Phase 1

- .ui = pure logic, no JSX
- .uix = has render() returning JSX
- All styles in alpine-ui.css with .aui- prefix
- Palette variables only — no hardcoded colors

## Architecture Migration Task
- [x] Overwrite existing library with the battle-tested 24 components from `alpine-erp-core/packages/ui` — 40 components now in packages/ui/src/, exported via index.ui.
- [x] Preserve the 7 external-only components (FilterMenu.uix, EmptyState.uix, FormView.uix, KanbanView.uix, AnalyticsView.uix, KpiCard.uix, SearchBar.uix) — all present in index.ui.
- [x] Consolidate styling dependencies — alpine-ui.css is the single style source with .aui- prefix.
- [ ] Switch external consumers (`alpine-erp-core`, `alpine-erp`) to rely strictly on this package, severing embedded UI dependencies — PENDING: neither repo currently imports from @kibologic/ui.
