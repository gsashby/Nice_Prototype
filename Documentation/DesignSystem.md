# Design System & Component Reference

The UI follows the NICE CXone Mpower design language. All styling is done with **Tailwind CSS v4** utility classes and inline styles — there is no separate design token file or CSS custom properties beyond the two root variables in `globals.css`.

---

## Colour tokens

### Global CSS variables (`globals.css`)

```css
:root {
  --background: #F2F4F7;   /* Page body background */
  --foreground: #1F2937;   /* Default text colour */
}
```

### Palette reference

| Token | Hex | Used for |
|---|---|---|
| **Navy** | `#0B2D55` | Top header background |
| **Page background** | `#F2F4F7` | Body behind cards |
| **Card background** | `#FFFFFF` | All card and panel surfaces |
| **Border** | `#E5E7EB` | Card borders, table dividers, drawer borders |
| **Border light** | `#F3F4F6` | Table row dividers |
| **Text primary** | `#111827` | Headings, bold values |
| **Text secondary** | `#374151` | Table cell content |
| **Text muted** | `#6B7280` | Labels, timestamps, subtext |
| **Text placeholder** | `#9CA3AF` | Input placeholders, empty states |
| **Text disabled** | `#D1D5DB` | Disabled nav items |
| **Blue primary** | `#2563EB` | Primary action buttons, active nav, links |
| **Blue hover** | `#1D4ED8` | Primary button hover state |
| **Blue light** | `#EFF6FF` | Active nav background, icon backgrounds |
| **Purple** | `#7C3AED` | AI action buttons (Summarize, Explain) |
| **Purple hover** | `#6D28D9` | AI button hover |

### Status / outcome colours

| Outcome | Badge bg | Badge text | Dot |
|---|---|---|---|
| `allowed` / healthy | `#DCFCE7` | `#15803D` | `#16A34A` |
| `flagged` / watch | `#FEF3C7` | `#92400E` | `#D97706` |
| `blocked` / critical | `#FEE2E2` | `#DC2626` | `#EF4444` |
| `auto-applied` / info | `#DBEAFE` | `#1D4ED8` | `#3B82F6` |

### Severity colours (alerts and policies)

| Severity | Badge bg | Badge text |
|---|---|---|
| `critical` | `#FEE2E2` | `#DC2626` |
| `high` | `#FFEDD5` | `#C2410C` |
| `medium` | `#FEF3C7` | `#92400E` |
| `low` | `#DBEAFE` | `#1D4ED8` |

### Module / model type colours

| Module | Badge bg | Badge text |
|---|---|---|
| Autopilot (name contains "autopilot") | `#EDE9FE` | `#6D28D9` |
| Copilot (name contains "copilot") | `#DBEAFE` | `#1D4ED8` |
| Mpower Agent (default) | `#CCFBF1` | `#0F766E` |

### KPI card accent gradients

| Card | Gradient |
|---|---|
| AI Decisions | `linear-gradient(90deg, #2563EB, #60A5FA)` |
| Confidence Score | `linear-gradient(90deg, #16A34A, #4ADE80)` |
| Policy Violations | `linear-gradient(90deg, #DC2626, #F87171)` |
| Compliance Coverage | `linear-gradient(90deg, #0D9488, #2DD4BF)` |

---

## Typography

All type is set in the system font stack (Tailwind default). No custom web fonts are loaded.

| Use | Size | Weight | Class |
|---|---|---|---|
| Page title (h1) | 20px | 700 | `text-[20px] font-bold` |
| Card heading | 13.5px | 700 | `text-[13.5px] font-bold` |
| Card subheading | 11.5px | 400 | `text-[11.5px]` |
| Table header | 11px | 700 | `text-[11px] font-bold uppercase tracking-[.05em]` |
| Table cell body | 12.5px | 400/600 | `text-[12.5px]` |
| Monospace (IDs, timestamps) | 11–11.5px | 400 | `font-mono text-[11px]` |
| Badge / pill | 10–11px | 700 | `text-[11px] font-semibold` |
| Button | 12px | 700 | `font-semibold` + inline `fontSize: 12` |
| Section label (uppercase) | 11px | 700 | `text-[11px] font-bold uppercase tracking-[.06em]` |

---

## Layout shell

**File:** `apps/web/src/app/(dashboard)/layout.tsx`

```
┌──────────────────────────────────────────────────────┐
│ TopHeader (h-12, navy #0B2D55, z-50)                  │
├────────────────┬─────────────────────────────────────┤
│ Sidebar        │ <main>                               │
│ (216px, white) │   px-8 py-6                          │
│                │   space-y-5 (between page sections)  │
│                │   {children}                         │
└────────────────┴─────────────────────────────────────┘
```

The sidebar width is fixed at `216px` (`minWidth: 216`). The main content area has `paddingLeft: 24` added at the page level (not in the layout), so the effective left offset from the sidebar divider is 24px.

---

## Shared components

### `PageHeader`

**File:** `apps/web/src/components/shared/PageHeader.tsx`

Used at the top of every page. Renders a breadcrumb, page title, optional description, and an `actions` slot for buttons.

```tsx
<PageHeader
  title="Audit Log Explorer"
  description="optional subtitle"           // shown inline next to title in muted text
  breadcrumb="Custom breadcrumb label"       // defaults to title if omitted
  actions={<div>...buttons...</div>}         // right-aligned
/>
```

The breadcrumb always starts with "AI Trust Center ›" followed by the breadcrumb/title value.

---

### `LoadingSkeleton`

**File:** `apps/web/src/components/shared/LoadingSkeleton.tsx`

A pulsing grey placeholder block used while data is loading.

```tsx
<LoadingSkeleton className="h-10" />       // table row height
<LoadingSkeleton className="h-[116px]" />  // KPI card height
<LoadingSkeleton className="h-[180px]" />  // chart height
```

Renders a `div` with `animate-pulse bg-[#E5E7EB] rounded-md`. Pass any height class via `className`.

---

### `SortTh`

**File:** `apps/web/src/components/shared/SortTh.tsx`

A sortable `<th>` element. Renders the column label with paired up/down arrow indicators. The active column shows blue arrows at full opacity; inactive columns show grey arrows at 30% opacity.

```tsx
const { sorted, sort, toggle } = useSortable<MyType>(data);

<SortTh
  label="Timestamp"
  colKey="event_time"   // must be a keyof the data type
  sort={sort}
  onToggle={toggle}
  className="px-3.5"
/>
```

First click → ascending. Second click on same column → descending. Clicking a different column resets to ascending on that column.

---

### `useSortable<T>`

**File:** `apps/web/src/lib/useSortable.ts`

Generic client-side sort hook. Sorts the current page of data only — not the full dataset.

```ts
const { sorted, sort, toggle } = useSortable<AuditEvent>(events);
// sorted  — the sorted array, ready to render
// sort    — current SortConfig<T>: { key, dir } | null
// toggle  — call with a keyof T to change sort column/direction
```

Null/undefined values sort to the end regardless of direction. Uses `useMemo` so the sort only recomputes when `data` or `sort` changes.

---

### `cn(...inputs)`

**File:** `apps/web/src/lib/utils.ts`

Standard `clsx` + `tailwind-merge` helper. Merges conditional class strings and resolves Tailwind conflicts (e.g. two `text-*` classes — last one wins).

```ts
cn('text-red-500', condition && 'text-blue-500')
// → 'text-blue-500' if condition is true (tailwind-merge resolves the conflict)
```

---

## Button patterns

There are three button types used consistently across the app. All use `inline-flex items-center` with `font-semibold` and `transition-all`.

### Primary (blue)

```tsx
className="inline-flex items-center rounded-[5px] bg-[#2563EB] font-semibold text-white hover:bg-[#1D4ED8] transition-all"
style={{ padding: '4px 10px', fontSize: 12 }}
```

### Secondary (white/border)

```tsx
className="inline-flex items-center rounded-[5px] border border-[#D1D5DB] bg-white font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all"
style={{ padding: '4px 10px', fontSize: 12 }}
```

### AI action (purple)

```tsx
className="inline-flex items-center gap-[6px] rounded-[5px] bg-[#7C3AED] font-semibold text-white hover:bg-[#6D28D9] transition-all"
style={{ padding: '4px 10px', fontSize: 12 }}
```

Disabled state for all three: add `disabled:opacity-60` and the `disabled` HTML attribute.

---

## Card / panel pattern

All content panels follow this structure:

```tsx
<div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
  {/* Header */}
  <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #E5E7EB' }}>
    <div className="text-[13.5px] font-bold text-[#111827]">Title</div>
    <div className="text-[11.5px] text-[#9CA3AF]">Subtitle</div>
  </div>

  {/* Body */}
  <div style={{ padding: '16px' }}>
    ...
  </div>

  {/* Footer (optional) */}
  <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
    ...
  </div>
</div>
```

The 4px top accent bar on KPI cards is an exception: `<div style={{ height: 4, background: gradient }} />` inserted before the body.

---

## Drawer pattern

Right-side drawers (440px for `AlertDrawer`, 520px for `AuditLogDrawer`) use the same CSS slide-in animation:

```tsx
<div
  className="fixed right-0 top-0 z-50 flex h-full w-[440px] flex-col bg-white"
  style={{
    transform: visible ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
    borderLeft: '1px solid #E5E7EB',
    boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
  }}
>
```

Always paired with a backdrop:

```tsx
<div
  className="fixed inset-0 z-40 bg-black/20"
  style={{ opacity: visible ? 1 : 0, transition: 'opacity .2s' }}
  onClick={onClose}
/>
```

Closing is always supported via: backdrop click, Escape key listener on `window`, and a close button.

---

## Modal pattern

Centred modals (`SiemModal`, `SummaryModal`) use scale + opacity animation:

```tsx
<div
  className="fixed left-1/2 top-1/2 z-50 w-full max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-white"
  style={{
    opacity: visible ? 1 : 0,
    transform: visible ? 'translate(-50%,-50%) scale(1)' : 'translate(-50%,-50%) scale(.96)',
    transition: 'opacity .2s, transform .2s',
    border: '1px solid #E5E7EB',
    boxShadow: '0 8px 40px rgba(0,0,0,.14)',
  }}
>
```

---

## Zustand stores

### `useAlertsStore`

**File:** `apps/web/src/stores/alerts-store.ts`

Holds acknowledged alert state in memory (not persisted). The `TopHeader` bell badge reads from this store. `AlertDrawer`'s Acknowledge button writes to it.

| Action | Effect |
|---|---|
| `addAlert(alert)` | Prepends alert, caps store at 100 entries |
| `acknowledgeAlert(id)` | Sets `acknowledged: true` on matching alert |
| `clearAlerts()` | Empties the store |

### `useUiStore`

**File:** `apps/web/src/stores/ui-store.ts`

Scaffolded for sidebar collapse and active view tracking. Neither `sidebarCollapsed` nor `setActiveView` are wired to any UI currently.

---

## Sidebar navigation

**File:** `apps/web/src/components/layout/Sidebar.tsx`

Five nav sections, each with a section label and nav items:

| Section | Items | Notes |
|---|---|---|
| AI Governance | Governance Dashboard, Audit Log Explorer, Policy Engine | Policy Engine has a badge: `3` |
| Reports & Queries | Board Report Builder, Natural Language Query | |
| Agent Tools | Agent Trust Panel | |
| Administration | Data Flow Visualizer | Disabled |
| Models & Incidents | Model Registry, Incident Timeline, Access Controls | All disabled; Incidents has badge `2` |

Active item: `border-left: 3px solid #2563EB`, `background: #EFF6FF`, `color: #1D4ED8`, `font-weight: 600`.  
Disabled items: `color: #D1D5DB`, click is prevented.

---

## Scrollbar styling

Global thin scrollbar defined in `globals.css`:

```css
::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
```
