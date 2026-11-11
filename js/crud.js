// Motor de CRUD reutilizável: tabela, busca, filtros, ordenação, paginação,
// formulário em modal, detalhes, exclusão com confirmação e exportação CSV.
// Cada módulo (clientes, vendas...) só descreve sua configuração.
class Crud {
  constructor(el, cfg) {
    this.el = el; this.cfg = cfg; this.rows = []; this.opts = {}; this.page = 1; this.size = 10;
    this.q = App.pendingSearch || ""; App.pendingSearch = ""; this.f = {};
    this.sort = { col: cfg.sortCol ?? null, dir: cfg.sortDir ?? 1 };
    this.view = cfg.altView && cfg.altDefault ? "alt" : "table";
  }
  get isAdmin() { return App.profile.role === "administrador"; }

  async init() {
    try { await Promise.all([this.loadLookups(), this.load()]); }
    catch (e) { this.el.innerHTML = `<div class="empty"><h3>Não foi possível carregar os dados</h3><p>${Utils.esc(Utils.friendlyError(e))}</p></div>`; return this; }
    this.build(); this.draw(); return this;
  }
  async load() {
    const { data, error } = await db.from(this.cfg.table).select(this.cfg.select || "*").order("created_at", { ascending: false });
    if (error) throw error; this.rows = data;
  }
  async loadLookups() {
    await Promise.all(this.cfg.fields.filter((f) => f.lookup).map(async (f) => {
      const L = f.lookup, { data, error } = await db.from(L.table).select(L.select);
      if (error) throw error;
      this.opts[f.name] = data.map((r) => ({ value: r.id, label: L.label(r) })).sort((a, b) => a.label.localeCompare(b.label));
    }));
  }
  optsOf(f) { return f.options || this.opts[f.name] || []; }

  build() {
    const c = this.cfg, filt = (c.filters || []).map((f) => `<select data-filter="${f.name}"><option value="">${f.label}: todos</option>${f.options.map((o) => `<option value="${o.value}">${Utils.esc(o.label)}</option>`).join("")}</select>`).join("");
    const dates = c.dateField ? `<label class="inline">De <input type="date" data-date="_from"></label><label class="inline">até <input type="date" data-date="_to"></label>` : "";
    const toggle = c.altView ? `<div class="seg"><button data-view="alt" class="${this.view === "alt" ? "on" : ""}">${c.altView.label}</button><button data-view="table" class="${this.view === "table" ? "on" : ""}">Tabela</button></div>` : "";
    this.el.innerHTML = `<div class="page-head"><div><h1>${c.title}</h1><p class="muted">${c.subtitle || ""}</p></div>
      <div class="actions"><button class="btn ghost" data-act="csv"><i data-lucide="download"></i>Exportar CSV</button>
      <button class="btn" data-act="new"><i data-lucide="plus"></i>${c.newLabel}</button></div></div>
      <div class="card"><div class="toolbar"><div class="search-box"><i data-lucide="search"></i><input data-q placeholder="Pesquisar…" value="${Utils.esc(this.q)}"></div>${filt}${dates}${toggle}</div>
      <div id="crud-body"></div><div class="pager" id="crud-pager"></div></div>`;
    this.el.onclick = (e) => this.onClick(e);
    this.el.oninput = (e) => { const t = e.target;
      if (t.matches("[data-q]")) this.q = t.value; else if (t.matches("[data-date]")) this.f[t.dataset.date] = t.value; else return;
      this.page = 1; this.draw(); };
    this.el.onchange = (e) => { if (e.target.matches("[data-filter]")) { this.f[e.target.dataset.filter] = e.target.value; this.page = 1; this.draw(); } };
    lucide.createIcons();
  }

  filtered() {
    const c = this.cfg; let r = this.rows;
    if (this.q) { const q = this.q.toLowerCase(); r = r.filter((x) => c.search(x).toLowerCase().includes(q)); }
    for (const f of c.filters || []) { const v = this.f[f.name]; if (v) r = r.filter((x) => (f.fn ? f.fn(x, v) : String(x[f.name]) === v)); }
    if (c.dateField) { const a = this.f._from, b = this.f._to; if (a) r = r.filter((x) => x[c.dateField] >= a); if (b) r = r.filter((x) => x[c.dateField] <= b); }
    if (this.sort.col != null) { const col = c.columns[this.sort.col];
      r = [...r].sort((x, y) => { const a = col.v(x), b = col.v(y); return (a > b ? 1 : a < b ? -1 : 0) * this.sort.dir; }); }
    return r;
  }

  draw() {
    const c = this.cfg, all = this.filtered(), body = this.el.querySelector("#crud-body"), pager = this.el.querySelector("#crud-pager");
    if (!this.rows.length) { body.innerHTML = `<div class="empty"><i data-lucide="${c.icon}"></i><h3>Nenhum registro ainda</h3><p>${c.emptyText}</p><button class="btn" data-act="new"><i data-lucide="plus"></i>${c.newLabel}</button></div>`; pager.innerHTML = ""; lucide.createIcons(); return; }
    if (!all.length) { body.innerHTML = '<div class="empty"><h3>Nada encontrado</h3><p>Ajuste a pesquisa ou os filtros.</p></div>'; pager.innerHTML = ""; return; }
    if (this.view === "alt") { c.altView.render(body, all, this); pager.innerHTML = ""; lucide.createIcons(); return; }
    const pages = Math.max(1, Math.ceil(all.length / this.size)); this.page = Math.min(this.page, pages);
    const slice = all.slice((this.page - 1) * this.size, this.page * this.size);
    const head = c.columns.map((col, i) => `<th data-sort="${i}" class="sortable">${col.label}${this.sort.col === i ? (this.sort.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
    const rows = slice.map((r) => `<tr class="${c.rowClass ? c.rowClass(r) : ""}">${c.columns.map((col) => `<td>${col.html ? col.html(r) : Utils.esc(col.v(r) ?? "—")}</td>`).join("")}<td class="row-actions">${this.actions(r)}</td></tr>`).join("");
    body.innerHTML = `<div class="table-wrap"><table><thead><tr>${head}<th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    pager.innerHTML = `<span class="muted">${all.length} registro(s)</span><div><button class="btn ghost sm" data-page="-1" ${this.page <= 1 ? "disabled" : ""}>Anterior</button><span class="pg">Página ${this.page} de ${pages}</span><button class="btn ghost sm" data-page="1" ${this.page >= pages ? "disabled" : ""}>Próxima</button></div>`;
    lucide.createIcons();
  }
  actions(r) {
    const extra = (this.cfg.rowActions || []).map((a, i) => (a.show && !a.show(r) ? "" : `<button class="icon-btn" title="${a.title}" data-act="ra" data-i="${i}" data-id="${r.id}"><i data-lucide="${a.icon}"></i></button>`)).join("");
    return `${extra}<button class="icon-btn" title="Detalhes" data-act="view" data-id="${r.id}"><i data-lucide="eye"></i></button>
      <button class="icon-btn" title="Editar" data-act="edit" data-id="${r.id}"><i data-lucide="pencil"></i></button>
      ${this.isAdmin || this.cfg.deleteAll ? `<button class="icon-btn danger" title="Excluir" data-act="del" data-id="${r.id}"><i data-lucide="trash-2"></i></button>` : ""}`;
  }

  onClick(e) {
    const pg = e.target.closest("[data-page]"); if (pg) { this.page += Number(pg.dataset.page); return this.draw(); }
    const so = e.target.closest("[data-sort]"); if (so) { const i = Number(so.dataset.sort);
      this.sort = this.sort.col === i ? { col: i, dir: -this.sort.dir } : { col: i, dir: 1 }; return this.draw(); }
    const vw = e.target.closest("[data-view]"); if (vw) { this.view = vw.dataset.view;
      this.el.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b === vw)); return this.draw(); }
    const b = e.target.closest("[data-act]"); if (!b) return;
    const row = this.rows.find((r) => r.id === b.dataset.id);
    ({ new: () => this.openForm(), csv: () => this.exportCsv(), edit: () => this.openForm(row), view: () => this.openDetail(row),
       del: () => this.remove(row), ra: () => this.cfg.rowActions[b.dataset.i].run(row, this) })[b.dataset.act]?.();
  }

  exportCsv() {
    const rows = this.filtered(); if (!rows.length) return Utils.toast("Não há dados para exportar.", "error");
    Utils.csv(this.cfg.csvName + "-" + Utils.today(), this.cfg.columns.map((c) => c.label), rows.map((r) => this.cfg.columns.map((c) => (c.csv ? c.csv(r) : c.v(r)))));
  }

  fieldHtml(f, row) {
    let val = row ? row[f.name] : typeof f.default === "function" ? f.default() : f.default;
    val = val ?? ""; const req = f.required ? "required" : "", id = "f_" + f.name; let input;
    if (f.type === "select") input = `<select id="${id}" name="${f.name}" ${req}><option value="">Selecione…</option>${this.optsOf(f).map((o) => `<option value="${Utils.esc(o.value)}" ${String(o.value) === String(val) ? "selected" : ""}>${Utils.esc(o.label)}</option>`).join("")}</select>`;
    else if (f.type === "textarea") input = `<textarea id="${id}" name="${f.name}" rows="3">${Utils.esc(val)}</textarea>`;
    else input = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${Utils.esc(val)}" ${req} ${f.mask ? `data-mask="${f.mask}"` : ""} ${f.type === "number" ? `step="${f.step || "any"}" min="${f.min ?? 0}" ${f.max != null ? `max="${f.max}"` : ""}` : ""} ${f.maxlength ? `maxlength="${f.maxlength}"` : ""}>`;
    return `<div class="field ${f.full ? "full" : ""}"><label for="${id}">${f.label}${f.required ? " *" : ""}</label>${input}</div>`;
  }

  openForm(row) {
    const c = this.cfg, m = App.modal({ title: (row ? "Editar " : "Novo(a) ") + c.singular, wide: true,
      body: `<form id="crud-form" class="form-grid" novalidate>${c.fields.map((f) => this.fieldHtml(f, row)).join("")}</form>`,
      footer: '<button class="btn ghost" data-close type="button">Cancelar</button><button class="btn" type="submit" form="crud-form">Salvar</button>' });
    const form = m.el.querySelector("form");
    form.addEventListener("input", (e) => { const k = e.target.dataset.mask; if (k) e.target.value = k === "phone" ? Utils.maskPhone(e.target.value) : Utils.maskDocument(e.target.value); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); const payload = {};
      for (const f of c.fields) { const el = form.elements[f.name]; let v = el.value.trim();
        if (f.required && !v) { el.focus(); return Utils.toast(`Preencha o campo "${f.label}".`, "error"); }
        if (f.type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { el.focus(); return Utils.toast("E-mail inválido.", "error"); }
        if (f.name === "state" && v) v = v.toUpperCase();
        payload[f.name] = v === "" ? null : f.type === "number" ? Number(v) : v; }
      const btn = m.el.querySelector("button[type=submit]"); btn.disabled = true; btn.classList.add("loading");
      const q = row ? db.from(c.table).update(payload).eq("id", row.id) : db.from(c.table).insert(payload);
      const { error } = await q; btn.disabled = false; btn.classList.remove("loading");
      if (error) return Utils.toast(Utils.friendlyError(error), "error");
      m.close(); Utils.toast(row ? "Registro atualizado." : "Registro criado com sucesso.");
      await this.reload(); App.refreshBell();
    });
  }

  async openDetail(row) {
    const c = this.cfg, val = (f) => { const v = row[f.name]; if (v == null || v === "") return "—";
      if (f.type === "select") return Utils.esc(this.optsOf(f).find((o) => String(o.value) === String(v))?.label ?? Utils.label(v));
      if (f.type === "date") return Utils.date(v); if (f.fmt) return f.fmt(v); return Utils.esc(v); };
    const m = App.modal({ title: c.detailTitle(row), wide: true, body: `<dl class="detail">${c.fields.map((f) => `<div class="${f.full ? "full" : ""}"><dt>${f.label}</dt><dd>${val(f)}</dd></div>`).join("")}<div><dt>Cadastrado em</dt><dd>${Utils.date(row.created_at)}</dd></div></dl><div id="detail-extra"></div>` });
    if (c.detailExtra) { try { m.el.querySelector("#detail-extra").innerHTML = await c.detailExtra(row); } catch (e) { /* extra opcional */ } }
  }

  async remove(row) {
    const r = await Swal.fire({ title: "Excluir registro?", text: "Esta ação não pode ser desfeita.", icon: "warning", showCancelButton: true,
      confirmButtonText: "Excluir", cancelButtonText: "Cancelar", confirmButtonColor: "#c8382f" });
    if (!r.isConfirmed) return;
    const { data, error } = await db.from(this.cfg.table).delete().eq("id", row.id).select();
    if (error) return Utils.toast(Utils.friendlyError(error), "error");
    if (!data.length) return Utils.toast("Você não tem permissão para excluir este registro.", "error");
    Utils.toast("Registro excluído."); await this.reload();
  }
  async patch(row, changes, msg) {   // atualização rápida usada por ações de linha e Kanban
    const { error } = await db.from(this.cfg.table).update(changes).eq("id", row.id);
    if (error) return Utils.toast(Utils.friendlyError(error), "error");
    if (msg) Utils.toast(msg); await this.reload(); App.refreshBell();
  }
  async reload() { try { await this.load(); this.draw(); } catch (e) { Utils.toast(Utils.friendlyError(e), "error"); } }
}
Crud.LK = {
  clients: { table: "clients", select: "id,full_name", label: (r) => r.full_name },
  companies: { table: "companies", select: "id,trade_name,legal_name", label: (r) => r.trade_name || r.legal_name },
  profiles: { table: "profiles", select: "id,full_name", label: (r) => r.full_name || "Sem nome" },
  opportunities: { table: "opportunities", select: "id,name", label: (r) => r.name }
};
