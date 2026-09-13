// NDTable.js
// Clean-room Data Table component for Observable Notebooks 2.0.
export function NDTable(data, options = {}) {
  const stateKey = Symbol.for("observable.ndTable.state");
  const saved = data[stateKey] ?? {derived: {}};
  const configuredDerived = options.derived ?? options.derive ?? {};
  const derived = new Map(Object.entries({...saved.derived, ...configuredDerived}));
  const managed = new Set(Object.keys(saved.derived));
  const detected = options.columns ?? data.columns ?? [...new Set(data.flatMap(Object.keys))];
  const sourceColumns = [...detected].filter((name) => !managed.has(name));
  const duplicate = Object.keys(configuredDerived).find((name) => sourceColumns.includes(name));
  if (duplicate) throw new Error(`Cannot create derived column "${duplicate}": a source column with the same name already exists.`);

  const config = {
    height: 520,
    minColumnWidth: 10,
    maxColumnWidth: 250,
    indexColumnWidth: 44,
    headerHeight: 54,
    profileHeight: 55,
    profileSvgHeight: 44,
    profileBarHeight: 38,
    profileBaselineY: 41,
    rowHeight: 20,
    searchWidth: 280,
    columnsPanelMinWidth: 420,
    editorNameWidth: 220,
    editorExpressionMinWidth: 300,
    editorTextareaHeight: 38,
    rootFontSize: 11,
    columnLabelFontSize: 12,
    lineHeight: 1.2,
    bins: 16,
    slice: [0, data.length],
    label: "data",
    ...options
  };
  let hidden = new Set();
  let filters = [];
  let sorts = [];
  let slice = [...config.slice];
  let query = "";
  let selectedProfile = null;
  let hoveredRow = null;
  let editing = null;

  const root = document.createElement("div");
  root.className = "odt";
  root.innerHTML = `<style>
    .odt{--blue:#9bb0dd;--blue-dark:#315ca9;--grey:#d9dde3;--line:#e2e5e9;font:${config.rootFontSize}px/${config.lineHeight} system-ui,-apple-system,"Segoe UI",sans-serif;color:#333;background:#fff}.odt *{box-sizing:border-box}
    .odt button,.odt input,.odt select,.odt textarea{font:inherit}.odt-wrap{max-height:${config.height}px;overflow:auto;border:1px solid var(--line);border-bottom:0}
    .odt table{border-collapse:separate;border-spacing:0;table-layout:fixed;width:max-content;min-width:100%}.odt th,.odt td{width:${config.minColumnWidth}px;min-width:${config.minColumnWidth}px;max-width:${config.maxColumnWidth}px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
    .odt th{position:sticky;top:0;z-index:3;padding:0;text-align:left;background:#fff;font-weight:400}.odt-index{width:${config.indexColumnWidth}px!important;min-width:${config.indexColumnWidth}px!important;max-width:${config.indexColumnWidth}px!important;text-align:right!important;color:#9aa0a6;background:#fafafa!important}
    .odt-head{height:${config.headerHeight}px;padding:7px 9px 4px;cursor:pointer;user-select:none;background:#fff}.odt-head:hover{background:#f7f8fa}.odt-title{display:flex;align-items:center;gap:5px}.odt-name{font-size:${config.columnLabelFontSize}px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.odt-arrow{font-size:9px;color:#6f9fe7}.odt-type-row{display:flex;align-items:center;margin-top:3px}.odt-type{border:0;background:transparent;color:#70757a;padding:0}.odt-edit{margin-left:auto;color:#8aa3ce;cursor:pointer;font:15px ui-monospace,monospace}
    .odt-profile{height:${config.profileHeight}px;padding:10px 1px 1px;background:#fff;overflow:hidden}.odt-profile svg{width:100%;height:${config.profileSvgHeight}px;display:block}.odt-invalid-summary{margin-top:8px;padding:7px;border:1px solid #b78b3c;border-radius:5px;background:#f4dfae;color:#815f22;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .odt table tbody td{height:${config.rowHeight}px!important;min-height:${config.rowHeight}px!important;font-size:${config.rootFontSize}px!important;line-height:${config.lineHeight}!important}.odt td{padding:5px 9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#fff}.odt tbody tr:hover td{background:#f4f4f4}.odt td.num{text-align:right;font-variant-numeric:tabular-nums}.odt td.invalid{color:#91969b}.odt .derived{background:#eef6ff!important}.odt td.profile-selected-cell{background:#dbe8fb!important;border-right:1px solid var(--line)!important;border-bottom:1px solid var(--line)!important}.odt tbody tr:hover td.profile-selected-cell{background:#cbdfff!important;border-right:1px solid var(--line)!important;border-bottom:1px solid var(--line)!important}
    .odt-searchbar{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--line)}.odt-searchbar input{width:${config.searchWidth}px;padding:6px 9px;border:1px solid #d9dde2;border-radius:5px}.odt-count{margin-left:auto;color:#666}
    .odt-toolbar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#eef6ff;border-top:1px solid #d9e5f5}.odt-toolbar button{border:0;background:transparent;padding:4px 6px;border-radius:4px;cursor:pointer;font-weight:600}.odt-toolbar button:hover,.odt-toolbar button.active{background:#fff}.odt-add{margin-left:auto!important;font-size:18px!important}
    .odt-panel{display:none;padding:10px 12px;border:1px solid #d7e2f0;background:#f8fbff}.odt-panel.open{display:block}.odt-line{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:5px 0}.odt-panel input,.odt-panel select,.odt-panel button,.odt-editor input,.odt-editor textarea,.odt-editor button{padding:6px 8px;border:1px solid #ccd2d9;border-radius:4px;background:#fff}.odt-columns{columns:3;min-width:${config.columnsPanelMinWidth}px}.odt-columns label{display:block;padding:3px}.odt-chip{display:inline-flex;gap:5px;align-items:center;margin:3px;padding:3px 6px;border:1px solid #d3d8df;border-radius:4px;background:#fff}
    .odt-editor{display:none;grid-template-columns:${config.editorNameWidth}px minmax(${config.editorExpressionMinWidth}px,1fr) auto auto auto;gap:8px;align-items:center;padding:10px 12px;border:1px solid #ccd9eb;background:#f8fbff}.odt-editor.open{display:grid}.odt-editor textarea{height:${config.editorTextareaHeight}px;resize:vertical;font:13px ui-monospace,monospace}.odt-editor .editor-actions{display:flex;gap:8px;align-items:stretch}.odt-editor .editor-actions button{width:68px;min-width:68px}.odt-editor .done{background:#3f68bd;color:#fff}.odt-editor .cancel{background:#c93f3f;color:#fff;border-color:#b73535}.odt-editor .cancel:hover{background:#b73535}.odt-editor .delete{background:#7f00ff;color:#fff;border-color:#6500cc;font-weight:700}.odt-editor .delete:hover{background:#6500cc}.odt-error{grid-column:1/-1;color:#a33131}.odt-help{display:none;padding:12px;border:1px solid #ccc;background:#fff}.odt-help.open{display:block}
    .odt-floating-tooltip{position:fixed;z-index:2147483647;display:none;max-width:320px;padding:6px 8px;border:1px solid rgba(0,0,0,.2);border-radius:4px;background:rgba(35,35,38,.96);color:#fff;box-shadow:0 3px 12px rgba(0,0,0,.25);font:${config.rootFontSize}px/${config.lineHeight} system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;pointer-events:none}
  </style>
  <div class="odt-wrap"><table><thead><tr></tr></thead><tbody></tbody></table></div>
  <div class="odt-searchbar"><span>${config.label}</span><input class="odt-search" placeholder="Search"><span class="odt-count"></span></div>
  <div class="odt-editor"></div><div class="odt-help"></div>
  <div class="odt-toolbar"><button data-panel="filter">⚑ Filter</button><button data-panel="columns">▣ Columns</button><button data-panel="sort">≡ Sort</button><button data-panel="slice">✂ Slice</button><button class="odt-add">＋</button></div>
  <div class="odt-panel" data-name="filter"></div><div class="odt-panel" data-name="columns"></div><div class="odt-panel" data-name="sort"></div><div class="odt-panel" data-name="slice"></div>`;

  const $ = (s) => root.querySelector(s);
  const tooltip = document.createElement("div");
  tooltip.className = "odt-floating-tooltip";
  tooltip.setAttribute("role", "tooltip");
  document.body.append(tooltip);
  function positionTooltip(event) {
    const gap = 14, margin = 8;
    const bounds = tooltip.getBoundingClientRect();
    let left = event.clientX - bounds.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - bounds.width - margin));
    let top = event.clientY - bounds.height - gap;
    if (top < margin) top = event.clientY + gap;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function showTooltip(event, text) {
    tooltip.textContent = text;
    tooltip.style.display = "block";
    positionTooltip(event);
  }
  function hideTooltip() { tooltip.style.display = "none"; }
  const missing = (v) => v == null || v === "" || (typeof v === "number" && !Number.isFinite(v));
  const compile = (expression) => new Function("row", "d", `return (${expression})`);
  const allColumns = () => [...sourceColumns, ...derived.keys()];
  const visibleColumns = () => allColumns().filter((c) => !hidden.has(c));

  function saveDefinitions() {
    Object.defineProperty(data, stateKey, {
      value: {derived: Object.fromEntries(derived)},
      configurable: true,
      writable: true,
      enumerable: false
    });
  }

  function syncData({persist = false} = {}) {
    const activeDerivedNames = new Set(derived.keys());
    const previouslyManagedNames = new Set([
      ...Object.keys(data[stateKey]?.derived ?? {}),
      ...managed
    ]);

    for (let index = 0; index < data.length; index++) {
      const target = data[index];
      const row = Object.fromEntries(
        sourceColumns.map((column) => [column, target[column]])
      );

      for (const oldName of previouslyManagedNames) {
        if (!activeDerivedNames.has(oldName)) delete target[oldName];
      }

      for (const [name, specification] of derived) {
        try {
          target[name] = typeof specification === "function"
            ? specification(row, index, data)
            : compile(specification)(row, row);
        } catch {
          target[name] = undefined;
        }
      }
    }

    if (Array.isArray(data.columns)) {
      data.columns = [...sourceColumns, ...derived.keys()];
    }

    if (persist) saveDefinitions();
    return data;
  }

  function removeDerived(name, {persist = true} = {}) {
    if (!name || !derived.has(name)) return false;

    for (const row of data) delete row[name];
    derived.delete(name);

    if (Array.isArray(data.columns)) {
      data.columns = data.columns.filter((column) => column !== name);
    }

    if (persist) saveDefinitions();
    return true;
  }

  function infer(rows, column) {
    const all = rows.map((row) => row[column]);
    const values = all.filter((value) => !missing(value));
    let type = "string";
    if (values.length && values.every((v) => typeof v === "number" && Number.isInteger(v))) type = "integer";
    else if (values.length && values.every((v) => typeof v === "number" && Number.isFinite(v))) type = "number";
    else if (values.length && values.every((v) => v instanceof Date && !Number.isNaN(+v))) type = "date";
    else if (values.length && values.every((v) => typeof v === "boolean")) type = "boolean";
    return {all, values, invalid: all.length - values.length, type};
  }

  function compare(a, b) {
    if (missing(a) || missing(b)) return Number(missing(a)) - Number(missing(b));
    if (typeof a === "number" && typeof b === "number") return a - b;
    if (a instanceof Date && b instanceof Date) return +a - +b;
    return String(a).localeCompare(String(b), undefined, {numeric: true, sensitivity: "base"});
  }

  function processed() {
    let rows = syncData().map((row, index) => ({...row, __odtIndex: index}));
    for (const filter of filters) rows = rows.filter((row) => {
      const value = row[filter.column], q = filter.value;
      if (filter.operator === "is null") return missing(value);
      if (filter.operator === "is not null") return !missing(value);
      if (filter.operator === "contains") return String(value ?? "").toLowerCase().includes(q.toLowerCase());
      if (filter.operator === "is") return String(value) === q;
      if (filter.operator === "is not") return String(value) !== q;
      if (filter.operator === "<") return Number(value) < Number(q);
      if (filter.operator === ">") return Number(value) > Number(q);
      return true;
    });
    if (query) rows = rows.filter((row) => allColumns().some((column) => String(row[column] ?? "").toLowerCase().includes(query)));
    rows.sort((a, b) => { for (const sort of sorts) { const result = compare(a[sort.column], b[sort.column]); if (result) return sort.direction * result; } return 0; });
    return {all: rows, shown: rows.slice(Math.max(0, +slice[0] || 0), Math.max(0, +slice[1] || 0))};
  }

  const format = (value) => value instanceof Date ? value.toISOString() : typeof value === "number" ? value.toLocaleString(undefined, {maximumFractionDigits: 5}) : String(value);

  function profile(column, info) {
    const holder = document.createElement("div"); holder.className = "odt-profile";
    if (!info.values.length) { holder.innerHTML = '<div class="odt-invalid-summary">all values: invalid…</div>'; return holder; }
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 150 ${config.profileSvgHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
    let segments;
    if (["number", "integer", "date"].includes(info.type)) {
      const numbers = info.values.map(Number), low = Math.min(...numbers), high = Math.max(...numbers), span = high - low || 1, counts = Array(config.bins).fill(0);
      numbers.forEach((value) => counts[Math.min(config.bins - 1, Math.floor((value - low) / span * config.bins))]++);
      segments = counts.map((count, index) => { const lower = low + index * span / config.bins, upper = low + (index + 1) * span / config.bins; return {count, label: `${format(lower)}–${format(upper)}`, test: (row) => { const value = Number(row[column]); return value >= lower && (index === config.bins - 1 ? value <= high : value < upper); }}; });
    } else {
      const frequencies = new Map(); info.values.forEach((value) => frequencies.set(String(value), (frequencies.get(String(value)) ?? 0) + 1));
      segments = [...frequencies].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({label, count, test: (row) => String(row[column]) === label}));
    }
    if (info.invalid) segments.push({label: "invalid", count: info.invalid, invalid: true, test: (row) => missing(row[column])});
    const maximum = Math.max(1, ...segments.map((segment) => segment.count)), width = 148 / segments.length;
    segments.forEach((segment, index) => {
      const bar = document.createElementNS(ns, "rect"), barHeight = config.profileBarHeight * segment.count / maximum;
      bar.dataset.profileBar = "true"; bar.__column = column; bar.__segment = segment; bar.__normal = segment.invalid ? "#aaa" : "#9bb0dd";
      const selected = selectedProfile?.column === column && selectedProfile?.label === segment.label;
      Object.entries({x: index * width + 1, y: config.profileBaselineY - barHeight, width: Math.max(2, width - 2), height: barHeight, fill: selected ? "#315ca9" : bar.__normal, stroke: selected ? "#174483" : "none"}).forEach(([key, value]) => bar.setAttribute(key, value));
      const tooltipText = `${segment.label}: ${segment.count} rows (${Math.round(100 * segment.count / info.all.length)}%)`;
      bar.style.cursor = "pointer";
      bar.addEventListener("pointerenter", (event) => showTooltip(event, tooltipText));
      bar.addEventListener("pointermove", positionTooltip);
      bar.addEventListener("pointerleave", hideTooltip);
      bar.onclick = (event) => { event.stopPropagation(); hideTooltip(); selectedProfile = selected ? null : {column, label: segment.label, test: segment.test}; render(); }; svg.append(bar);
    });
    holder.append(svg); return holder;
  }

  function updateProfileHover() {
    root.querySelectorAll('[data-profile-bar="true"]').forEach((bar) => {
      const match = hoveredRow && bar.__segment.test(hoveredRow);
      const selected = selectedProfile?.column === bar.__column && selectedProfile?.label === bar.__segment.label;
      bar.setAttribute(
        "fill",
        selected
          ? "#315ca9"
          : hoveredRow
            ? match
              ? bar.__normal
              : "#d9dde3"
            : bar.__normal
      );
      bar.setAttribute(
        "stroke",
        selected || match ? "#174483" : "none"
      );
    });
  }

  function cycleSort(column) {
    const current = sorts.length === 1 && sorts[0].column === column ? sorts[0].direction : 0;
    sorts = current === 0 ? [{column, direction: 1}] : current === 1 ? [{column, direction: -1}] : [];
    render();
  }

  function render() {
    hideTooltip();
    hoveredRow = null;
    const result = processed(), columns = visibleColumns(), profileRows = result.all;
    const head = $("thead tr"), body = $("tbody"); head.replaceChildren(); body.replaceChildren();
    const indexHead = document.createElement("th"); indexHead.className = "odt-index"; head.append(indexHead);
    for (const column of columns) {
      const info = infer(profileRows, column), th = document.createElement("th"); if (derived.has(column)) th.classList.add("derived");
      const sort = sorts.find((entry) => entry.column === column), heading = document.createElement("div"); heading.className = "odt-head";
      heading.innerHTML = `<div class="odt-title"><span class="odt-name"></span><span class="odt-arrow">${sort ? sort.direction > 0 ? "▲" : "▼" : ""}</span></div><div class="odt-type-row"><span class="odt-type">${info.type}</span>${derived.has(column) ? '<span class="odt-edit">{}</span>' : ""}</div>`;
      heading.querySelector(".odt-name").textContent = column;
      heading.onclick = (event) => { if (!event.target.closest(".odt-edit")) cycleSort(column); };
      heading.querySelector(".odt-edit")?.addEventListener("click", (event) => { event.stopPropagation(); openEditor(column); });
      th.append(heading, profile(column, info)); head.append(th);
    }
    for (const row of result.shown) {
      const tr = document.createElement("tr");
      const rowMatchesProfile = selectedProfile?.test(row) ?? false;
      tr.onmouseenter = () => { hoveredRow = row; updateProfileHover(); };
      tr.onmouseleave = () => { hoveredRow = null; updateProfileHover(); };
      const indexCell = document.createElement("td");
      indexCell.className = "odt-index";
      if (rowMatchesProfile) indexCell.classList.add("profile-selected-cell");
      indexCell.textContent = row.__odtIndex + 1;
      tr.append(indexCell);
      for (const column of columns) {
        const td = document.createElement("td"), value = row[column];
        if (derived.has(column)) td.classList.add("derived");
        if (rowMatchesProfile) td.classList.add("profile-selected-cell");
        if (missing(value)) {
          td.textContent = String(value);
          td.classList.add("invalid");
        } else {
          td.textContent = format(value);
          td.title = td.textContent;
          if (typeof value === "number") td.classList.add("num");
        }
        tr.append(td);
      }
      body.append(tr);
    }
    $(".odt-count").textContent = `${result.all.length.toLocaleString()} rows`; root.value = result.shown; renderPanels();
  }

  $(".odt-search").oninput = (event) => { query = event.target.value.toLowerCase(); render(); };
  root.querySelectorAll("[data-panel]").forEach((button) => button.onclick = () => { const name = button.dataset.panel; root.querySelectorAll(".odt-panel").forEach((panel) => panel.classList.toggle("open", panel.dataset.name === name && !panel.classList.contains("open"))); });

  function renderPanels() {
    const columns = allColumns();
    const cp = root.querySelector('[data-name="columns"]'); cp.innerHTML = '<div class="odt-line"><button data-all>Show all</button></div><div class="odt-columns"></div>';
    columns.forEach((column) => { const label = document.createElement("label"), box = document.createElement("input"); box.type = "checkbox"; box.checked = !hidden.has(column); box.onchange = () => { box.checked ? hidden.delete(column) : hidden.add(column); render(); }; label.append(box, ` ${column}`); cp.querySelector(".odt-columns").append(label); }); cp.querySelector("[data-all]").onclick = () => { hidden.clear(); render(); };
    const fp = root.querySelector('[data-name="filter"]'); fp.innerHTML = `<div class="odt-line"><select class="fc">${columns.map((c) => `<option>${c}</option>`).join("")}</select><select class="fo"><option>is</option><option>is not</option><option>contains</option><option>&lt;</option><option>&gt;</option><option>is null</option><option>is not null</option></select><input class="fv" placeholder="value"><button data-add>Add</button><button data-clear>Clear</button></div>`; fp.querySelector("[data-add]").onclick = () => { filters.push({column: fp.querySelector(".fc").value, operator: fp.querySelector(".fo").value, value: fp.querySelector(".fv").value}); render(); }; fp.querySelector("[data-clear]").onclick = () => { filters = []; render(); };
    const sp = root.querySelector('[data-name="sort"]'); sp.innerHTML = `<div class="odt-line"><select class="sc">${columns.map((c) => `<option>${c}</option>`).join("")}</select><select class="sd"><option value="1">Ascending</option><option value="-1">Descending</option></select><button data-add>Add key</button><button data-clear>Clear</button></div>`; sp.querySelector("[data-add]").onclick = () => { sorts.push({column: sp.querySelector(".sc").value, direction: +sp.querySelector(".sd").value}); render(); }; sp.querySelector("[data-clear]").onclick = () => { sorts = []; render(); };
    const sl = root.querySelector('[data-name="slice"]'); sl.innerHTML = `<div class="odt-line">Start <input class="start" type="number" value="${slice[0]}"> End <input class="end" type="number" value="${slice[1]}"><button>Apply</button></div>`; sl.querySelector("button").onclick = () => { slice = [+sl.querySelector(".start").value, +sl.querySelector(".end").value]; render(); };
  }

  function openEditor(name = "") {
    const editor = $(".odt-editor");
    const help = $(".odt-help");
    const exists = derived.has(name);
    const existing = exists ? derived.get(name) : undefined;
    const sessionSnapshot = new Map(derived);
    const originalEditingName = exists ? name : null;

    editing = originalEditingName;
    editor.classList.add("open");
    help.classList.remove("open");

    editor.innerHTML = `<input class="ename" placeholder="column name"><textarea class="expr" placeholder='row["column"]'></textarea><button class="help">?</button><button class="run">▷</button><span class="editor-actions"><button class="done">Done</button><button class="cancel">Cancel</button></span>${exists ? '<button class="delete">Delete</button>' : ""}<div class="odt-error"></div>`;

    editor.querySelector(".ename").value = name;
    editor.querySelector(".expr").value = typeof existing === "function"
      ? `(${existing.toString()})(row)`
      : typeof existing === "string"
        ? existing
        : "";

    const closeEditor = () => {
      editor.classList.remove("open");
      help.classList.remove("open");
      editing = null;
    };

    const restoreSession = () => {
      const previewNames = [...derived.keys()];
      derived.clear();
      for (const [column, specification] of sessionSnapshot) {
        derived.set(column, specification);
      }
      for (const previewName of previewNames) {
        if (!sessionSnapshot.has(previewName)) {
          for (const row of data) delete row[previewName];
        }
      }
      syncData({persist: false});
    };

    const apply = ({close, persist}) => {
      const newName = editor.querySelector(".ename").value.trim();
      const expression = editor.querySelector(".expr").value.trim();
      const error = editor.querySelector(".odt-error");

      if (!newName || !expression) {
        error.textContent = "Enter a column name and expression.";
        return false;
      }

      const editingSameDerived = editing === newName && derived.has(newName);
      const collision = sourceColumns.includes(newName) ||
        (derived.has(newName) && !editingSameDerived);

      if (collision) {
        error.textContent = `Cannot create column "${newName}": a column with that name already exists.`;
        return false;
      }

      try {
        compile(expression);

        if (editing && editing !== newName) {
          removeDerived(editing, {persist: false});
        }

        derived.set(newName, expression);
        editing = newName;
        syncData({persist});
        error.textContent = "";

        if (close) closeEditor();
        render();
        return true;
      } catch (cause) {
        error.textContent = cause.message;
        return false;
      }
    };

    editor.querySelector(".run").onclick = () =>
      apply({close: false, persist: false});

    editor.querySelector(".done").onclick = () =>
      apply({close: true, persist: true});

    editor.querySelector(".cancel").onclick = () => {
      restoreSession();
      closeEditor();
      render();
    };

    editor.querySelector(".delete")?.addEventListener("click", () => {
      const nameToDelete = editing ?? originalEditingName;
      if (nameToDelete) removeDerived(nameToDelete, {persist: true});
      closeEditor();
      render();
    });

    editor.querySelector(".help").onclick = () => {
      help.classList.toggle("open");
      help.innerHTML = '<strong>Examples</strong><br><code>row["price"] * row["quantity"]</code><br><code>row["a"] - row["b"]</code>';
    };
  }

  $(".odt-add").onclick = () => openEditor();
  syncData({persist: true});
  root.data = data;
  root.synchronizeData = () => syncData({persist: true}); root.clearProfileSelection = () => { selectedProfile = null; render(); }; root.clearSort = () => { sorts = []; render(); };
  render(); return root;
}
