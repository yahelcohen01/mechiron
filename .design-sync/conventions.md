# Building with the Mechiron design system

Mechiron is an RFQ (request-for-quote) tool for mechanical part sourcing. Its
UI is **Hebrew-first and RTL by default**, with English as a second locale.

## Setup — there is no provider

Components are plain React with no context requirement. Import from
`window.Mechiron` and render directly:

```jsx
const { Button, Input, DataTable, StatusBadge } = window.Mechiron;
<Button variant="primary">+ בקשה חדשה</Button>
```

One exception worth knowing: `StatusBadge` reads its label from the app's i18n
context, whose **default is Hebrew**. It renders correct Hebrew labels with no
setup; there is no exported provider to switch it to English.

## Direction and dark mode — both are load-bearing

**Direction.** Set `dir="rtl"` on the outermost element of any Hebrew screen.
Then use **logical** spacing utilities so layouts mirror correctly, never the
physical ones:

| Use | Not |
|---|---|
| `ps-4` `pe-4` `ms-2` `me-2` | `pl-4` `pr-4` `ml-2` `mr-2` |
| `border-s` `border-e` | `border-l` `border-r` |
| `text-start` `text-end` | `text-left` `text-right` |

Keep identifiers that are always read LTR — emails, part numbers, phone
numbers — in `dir="ltr"` spans inside an RTL page.

**Dark mode** is class-based: a `.dark` class on an ancestor. Every surface
you style needs both halves, e.g.
`bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`. A component that
only styles the light side looks broken for half the users.

## The styling idiom: Tailwind utilities

There are no component-specific CSS classes and no theme object — style with
Tailwind utility classes. The shipped stylesheet is a **compiled** sheet, so
stay inside the vocabulary it contains:

| Family | Values available |
|---|---|
| Colour | `{bg,text,border,ring,divide}-{gray,slate,blue,red,green,amber,yellow,indigo,purple,pink,teal,emerald,orange}-{50…950}`, plus `white` / `black` |
| Spacing | `{p,px,py,ps,pe,pt,pb,m,mx,my,ms,me,gap}-{0…12,16,20,24}` |
| Sizing | `{w,h,min-w,max-w,size}-{0…12,16,20,24,32,40,48,64,full,screen,fit,auto}` |
| Type | `text-{xs,sm,base,lg,xl,2xl,3xl,4xl}`, `font-{normal,medium,semibold,bold}` |
| Radius / shadow | `rounded{,-sm,-md,-lg,-xl,-2xl,-full}`, `shadow{,-sm,-md,-lg,-xl,-none}` |
| Layout | `flex`, `grid`, `grid-cols-{1..6,12}`, `items-*`, `justify-*`, `flex-1`, `hidden` |
| Variants | `hover:`, `focus:`, `dark:`, `dark:hover:`, `sm:`, `md:`, `lg:` |

Arbitrary values (`w-[37px]`, `bg-[#abc]`) are **not** compiled into the sheet
and will render unstyled — use the scale above.

### The app's own palette

Blue is the primary/action colour (`bg-blue-600`, hover `bg-blue-700`), red is
destructive (`bg-red-600`), and grays carry every surface and border. Cards and
tables use `rounded-lg`/`rounded-xl` with `border-gray-200 dark:border-gray-700`.
Table cells are `px-4 py-3`.

### Typography

The brand font is **Heebo**, shipped with the system and wired as the default
sans — you get it automatically, no font class needed. It covers Hebrew and
Latin.

## Where the truth lives

- `styles.css` at the design system's root and its `@import`s
  (`_ds_bundle.css`, `fonts/fonts.css`) — the real, complete stylesheet. Read
  it before inventing a class.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract per component.
- `components/<group>/<Name>/<Name>.prompt.md` — usage notes per component.

## A worked example

```jsx
const { DataTable, StatusBadge, Button, EmptyState } = window.Mechiron;

function RfqList({ rows }) {
  return (
    <div dir="rtl" className="p-6 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          הצעות מחיר
        </h1>
        <Button>+ בקשה חדשה</Button>
      </div>

      <DataTable
        headers={['לקוח', 'מק"ט', 'כמות', 'סטטוס']}
        isEmpty={rows.length === 0}
        emptyState={<EmptyState title="אין בקשות" description="צור בקשה חדשה כדי להתחיל." />}
      >
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.client}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400" dir="ltr">{r.sn}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.qty}</td>
            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
```

Note the pattern: library components for the controls, Tailwind utilities for
your own layout glue, `dir="rtl"` at the top, `dir="ltr"` on the part number.
