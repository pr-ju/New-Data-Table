# New-Data-Table aka NDTable

`NDTable` is a clean-room, interactive data-table component for Observable Notebooks 2.0. It combines a scrollable table with column profiles, searching, filtering, sorting, slicing, column visibility controls, and programmatically derived columns.

## Features

- Displays JavaScript arrays of row objects, including typed CSV data.
- Detects `integer`, `number`, `date`, `boolean`, and `string` columns.
- Shows a distribution profile above every visible column.
- Uses histograms for numeric and date columns.
- Uses frequency bars for categorical and Boolean columns.
- Includes invalid or missing values in column profiles.
- Shows an HTML tooltip above the pointer when hovering over a profile bar.
- Highlights a matching row and its corresponding profile segment during row hover.
- Selects a profile segment when clicked and highlights matching rows.
- Sorts by clicking a column heading.
- Supports multi-key sorting through the **Sort** panel.
- Searches across all columns.
- Supports explicit filters with multiple operators.
- Shows or hides individual columns.
- Slices the displayed row range.
- Creates, previews, edits, renames, and deletes derived columns.
- Persists derived-column definitions on the data array.
- Exposes the displayed rows through the returned component's `value` property.

## Installation

Copy `NDTable.js` into the same directory as the Observable Notebook page that uses it.

## Basic usage

```js
import {NDTable} from "./NDTable.js";
```

Load a CSV file with typed values:

```js
const data = await FileAttachment("data.csv").csv({typed: true});
```

Display the table:

```js
display(NDTable(data));
```

Using `{typed: true}` is recommended. Without typed CSV parsing, numeric, Boolean, and date-like values may remain strings and will therefore be profiled and sorted as strings.

## Constructor

```js
NDTable(data, options)
```

### `data`

An array of row objects:

```js
const data = [
  {name: "Alpha", score: 8, passed: true},
  {name: "Beta", score: 5, passed: false}
];
```

If `data.columns` exists, `NDTable` uses it as the default column order. Otherwise, the component forms the column list from the property names occurring in the data rows.

`NDTable` mutates the supplied array when derived columns are created, changed, or removed.

### `options`

All options are optional.

| Option | Default | Description |
|---|---:|---|
| `height` | `520` | Maximum height, in pixels, of the scrollable table area. |
| `minColumnWidth` | `10` | Minimum width of ordinary table columns, in pixels. |
| `maxColumnWidth` | `250` | Maximum width of ordinary table columns, in pixels. |
| `indexColumnWidth` | `44` | Width of the row-index column, in pixels. |
| `headerHeight` | `54` | Height of each column's name and type area, in pixels. |
| `profileHeight` | `55` | Height of the distribution-profile area, in pixels. |
| `profileSvgHeight` | `44` | Height of the SVG used for a column profile. |
| `profileBarHeight` | `38` | Maximum profile-bar height. |
| `profileBaselineY` | `41` | Vertical SVG baseline used to position profile bars. |
| `rowHeight` | `20` | Minimum body-row height, in pixels. |
| `searchWidth` | `280` | Width of the search input, in pixels. |
| `columnsPanelMinWidth` | `420` | Minimum width of the column-visibility panel. |
| `editorNameWidth` | `220` | Width of the derived-column name field. |
| `editorExpressionMinWidth` | `300` | Minimum width of the derived-column expression field. |
| `editorTextareaHeight` | `38` | Initial height of the expression editor. |
| `rootFontSize` | `11` | Base table font size, in pixels. |
| `columnLabelFontSize` | `12` | Column-name font size, in pixels. |
| `lineHeight` | `1.2` | Base line-height multiplier. |
| `bins` | `16` | Number of histogram bins for numeric and date columns. |
| `slice` | `[0, data.length]` | Initial half-open row interval to display. |
| `label` | `"data"` | Label displayed to the left of the search box. |
| `columns` | inferred | Explicit source-column names and order. |
| `derived` | `{}` | Initial derived-column definitions. |
| `derive` | `{}` | Alias for `derived`. `derived` takes precedence if both are supplied. |

Example:

```js
display(NDTable(data, {
  label: "Experiment results",
  height: 640,
  rowHeight: 24,
  bins: 20,
  columns: ["participant", "condition", "score"]
}));
```

## Column profiles

Each visible column has a profile directly below its name and inferred type.

### Numeric, integer, and date columns

The component divides the observed range into `bins` equal-width intervals and draws a histogram. Bar height represents the number of values in the corresponding interval.

The last interval includes the maximum observed value. Missing and otherwise invalid values are represented by an additional profile segment.

### String and Boolean columns

The component groups values by their string representation and draws one frequency bar per distinct representation. Bars are ordered by descending frequency.

### Profile tooltips

Hovering over a profile bar displays an HTML tooltip containing:

- the category or interval;
- the matching row count; and
- the percentage of values represented by the segment.

The tooltip follows the pointer and normally appears above it. If insufficient viewport space is available above the pointer, the tooltip appears below it.

### Profile selection and row highlighting

Clicking a profile bar selects that segment. Matching rows are highlighted across the table. Clicking the selected segment again clears the selection; selecting a different segment replaces the previous selection.

Profile selection is visual. It does not remove nonmatching rows from the table.

Hovering over a body row also emphasizes the matching segment within each column profile and mutes nonmatching segments.

## Sorting

### Sort by a column heading

Click a column heading to cycle through:

1. ascending;
2. descending; and
3. unsorted.

Heading sorting uses one key at a time.

- Numbers are compared numerically.
- Dates are compared chronologically when represented by `Date` objects.
- Other values use locale-aware string comparison with numeric ordering and case-insensitive matching.
- Missing values are placed after valid values in ascending order.

### Multi-key sorting

Open the **Sort** panel to add multiple sort keys. Each key can be ascending or descending. Keys are evaluated in the order in which they were added.

Use **Clear** in the Sort panel to remove all sort keys.

## Searching

The search field performs a case-insensitive substring search across all columns, including columns hidden from display.

```text
Search: alpha
```

Only rows containing the query in at least one column remain visible. Clearing the search field restores the rows permitted by the explicit filters.

## Filtering

Open the **Filter** panel, choose a column and operator, enter a value when required, and select **Add**.

Supported operators:

| Operator | Behavior |
|---|---|
| `is` | Compares the string representation for equality. |
| `is not` | Keeps rows whose string representation differs. |
| `contains` | Performs a case-insensitive substring search within the selected column. |
| `<` | Converts both operands to numbers and applies numeric less-than comparison. |
| `>` | Converts both operands to numbers and applies numeric greater-than comparison. |
| `is null` | Matches `null`, `undefined`, an empty string, and non-finite numeric values. |
| `is not null` | Matches values not classified as missing. |

Each added filter is combined with the existing filters using logical AND. Use **Clear** to remove all explicit filters.

## Column visibility

Open the **Columns** panel and clear a checkbox to hide a column. Select the checkbox again to restore it.

**Show all** restores every source and derived column.

Hiding a column affects display only. Hidden columns remain available to search, filtering, sorting, and derived-column expressions.

## Slicing rows

Open the **Slice** panel to set `Start` and `End`, then select **Apply**.

The slice follows JavaScript's half-open interval convention:

```js
rows.slice(start, end)
```

For example, `[0, 25]` displays at most the first 25 processed rows. Slicing is applied after filtering, searching, and sorting.

## Derived columns

Derived columns may be configured programmatically or created interactively.

### Programmatic derived columns

Pass functions through `derived`:

```js
display(NDTable(data, {
  derived: {
    total: row => row.price * row.quantity,
    difference: row => row.observed - row.expected
  }
}));
```

A function receives:

```js
(row, index, data)
```

- `row` contains the source columns.
- `index` is the source-row index.
- `data` is the supplied data array.

The alias `derive` is also accepted:

```js
display(NDTable(data, {
  derive: {
    total: row => row.price * row.quantity
  }
}));
```

### Interactive derived-column editor

Select **＋** to open the editor.

1. Enter a column name.
2. Enter a JavaScript expression.
3. Select **▷** to preview the expression without persisting the definition.
4. Select **Done** to apply and persist it.
5. Select **Cancel** to restore the state from before the editor session.

Example expressions:

```js
row["price"] * row["quantity"]
```

```js
row["observed"] - row["expected"]
```

```js
row["score"] >= 50
```

Inside an expression, `row` and `d` refer to the same source-row object.

Derived columns are visually distinguished with a light-blue background. Select the `{}` control in a derived column's header to edit the column. Existing derived columns can be renamed or deleted from the editor.

A derived-column name may not duplicate a source-column name or another derived-column name.

### Persistence

Derived definitions are stored as non-enumerable state on the supplied data array under:

```js
Symbol.for("observable.ndTable.state")
```

This allows a later `NDTable` instance using the same array object to recover saved derived definitions. Persistence is attached to the in-memory array object; it is not written back to a CSV file automatically.

## Processing order

Rows are processed in this order:

1. synchronize derived columns;
2. apply explicit filters;
3. apply the global search query;
4. apply sorting;
5. apply the configured slice.

Column profiles are calculated from the processed rows before slicing. Consequently, profiles reflect filters, searching, and sorting, but not the final displayed slice.

## Returned component and public API

`NDTable` returns a DOM element suitable for `display(...)`:

```js
const table = NDTable(data);
display(table);
```

### Properties

| Property | Description |
|---|---|
| `table.data` | The supplied data array, including synchronized derived-column values. |
| `table.value` | The currently displayed rows after filtering, searching, sorting, and slicing. Rows include an internal `__odtIndex` property. |

### Methods

#### `table.synchronizeData()`

Recalculates derived-column values and persists the current derived definitions.

```js
table.synchronizeData();
```

#### `table.clearProfileSelection()`

Clears the selected profile segment and removes profile-based row highlighting.

```js
table.clearProfileSelection();
```

#### `table.clearSort()`

Removes all active sort keys.

```js
table.clearSort();
```

## Complete example

```js
import {NDTable} from "./NDTable.js";

const data = await FileAttachment("results.csv").csv({
  typed: true
});

const table = NDTable(data, {
  label: "Results",
  height: 600,
  bins: 18,
  slice: [0, 100],
  derived: {
    difference: row => row.guessed - row.expected,
    correct: row => row.guessed === row.expected
  }
});

display(table);
```

## Current limitations and implementation notes

- The component is designed for Observable Notebooks 2.0 and uses browser DOM and SVG APIs.
- Derived string expressions are compiled with `new Function`. Only use expressions from trusted authors.
- Derived-column dependencies are not chained automatically. Each derived calculation receives an object containing the source columns, not previously calculated derived values.
- Date inference requires actual `Date` objects.
- Categorical values are grouped by their string representation, so distinct values with identical string representations share a profile segment.
- The profile tooltip is appended to `document.body`.
- A new tooltip element is created for each `NDTable` instance.
- Row numbers shown in the table are one-based source indices and therefore retain source-row identity after sorting or filtering.

## License

Add the license selected for the repository here, for example MIT, BSD-3-Clause, or another license appropriate for the project.
