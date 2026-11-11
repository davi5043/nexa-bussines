// Módulo Oportunidades: Kanban (arrastar e soltar) + tabela
const kanban = {
  label: "Kanban",
  render(el, rows, crud) {
    el.innerHTML = `<div class="kanban">${Utils.STAGES.map((s) => { const items = rows.filter((r) => r.stage === s);
      return `<div class="kcol" data-stage="${s}"><div class="khead"><b>${Utils.label(s)}</b><span>${items.length} · ${Utils.currency(items.reduce((a, r) => a + Number(r.estimated_value), 0))}</span></div>
      <div class="kbody">${items.map((r) => `<div class="kcard" draggable="true" data-id="${r.id}"><a href="#" data-open="${r.id}">${Utils.esc(r.name)}</a>
        <div class="muted">${Utils.esc(r.clients?.full_name || r.companies?.trade_name || "Sem cliente")}</div>
        <div class="kmeta"><b>${Utils.currency(r.estimated_value)}</b><span>${r.probability}%</span></div>
        <select class="kmove" data-move="${r.id}" aria-label="Mover etapa">${Utils.STAGES.map((x) => `<option value="${x}" ${x === s ? "selected" : ""}>${Utils.label(x)}</option>`).join("")}</select></div>`).join("")}</div></div>`; }).join("")}</div>`;
    const move = (id, stage) => { const row = crud.rows.find((r) => r.id === id); if (!row || row.stage === stage) return;
      crud.patch(row, { stage, ...(stage === "ganho" ? { probability: 100 } : stage === "perdido" ? { probability: 0 } : {}) }, `Movida para "${Utils.label(stage)}".`); };
    el.querySelectorAll(".kcard").forEach((c) => c.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", c.dataset.id)));
    el.querySelectorAll(".kcol").forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); move(e.dataTransfer.getData("text/plain"), col.dataset.stage); });
    });
    el.querySelectorAll("[data-move]").forEach((s) => s.addEventListener("change", () => move(s.dataset.move, s.value)));
    el.querySelectorAll("[data-open]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); crud.openDetail(crud.rows.find((r) => r.id === a.dataset.open)); }));
  }
};
App.register("opportunities", {
  title: "Oportunidades",
  async render(el) {
    await new Crud(el, {
      table: "opportunities", select: "*, clients(full_name), companies(trade_name,legal_name), profiles(full_name)", title: "Oportunidades",
      subtitle: "Acompanhe o pipeline comercial. Arraste os cartões entre as etapas.", singular: "oportunidade", newLabel: "Nova oportunidade", icon: "target",
      csvName: "oportunidades", emptyText: "Crie sua primeira oportunidade para começar o pipeline.", detailTitle: (r) => r.name, altView: kanban, altDefault: true,
      search: (r) => [r.name, r.clients?.full_name, r.companies?.trade_name, r.companies?.legal_name].join(" "),
      filters: [{ name: "stage", label: "Etapa", options: Utils.opts(Utils.STAGES) }],
      columns: [
        { label: "Oportunidade", v: (r) => r.name }, { label: "Cliente", v: (r) => r.clients?.full_name || "" },
        { label: "Responsável", v: (r) => r.profiles?.full_name || "" },
        { label: "Valor", v: (r) => Number(r.estimated_value), html: (r) => Utils.currency(r.estimated_value) },
        { label: "Etapa", v: (r) => r.stage, html: (r) => Utils.badge(r.stage) }, { label: "Prob.", v: (r) => r.probability, html: (r) => r.probability + "%" },
        { label: "Prev. fechamento", v: (r) => r.expected_close_date || "", html: (r) => Utils.date(r.expected_close_date) }],
      fields: [
        { name: "name", label: "Nome da oportunidade", required: true, full: true },
        { name: "client_id", label: "Cliente", type: "select", lookup: Crud.LK.clients }, { name: "company_id", label: "Empresa", type: "select", lookup: Crud.LK.companies },
        { name: "owner_id", label: "Responsável comercial", type: "select", lookup: Crud.LK.profiles, default: () => App.profile.id },
        { name: "estimated_value", label: "Valor estimado (R$)", type: "number", step: "0.01", required: true, default: 0, fmt: Utils.currency },
        { name: "opened_at", label: "Data de abertura", type: "date", default: Utils.today, required: true }, { name: "expected_close_date", label: "Previsão de fechamento", type: "date" },
        { name: "stage", label: "Etapa", type: "select", options: Utils.opts(Utils.STAGES), default: "novo_lead", required: true },
        { name: "probability", label: "Probabilidade (%)", type: "number", min: 0, max: 100, default: 10, required: true },
        { name: "description", label: "Descrição", type: "textarea", full: true }]
    }).init();
  }
});
