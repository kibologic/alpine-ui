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

## Extension rules
- .ui = pure logic, no JSX
- .uix = has render() returning JSX
- All styles in alpine-ui.css with .aui- prefix
- Palette variables only — no hardcoded colors
