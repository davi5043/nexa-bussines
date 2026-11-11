// Módulo Clientes
const ST = [{ value: "ativo", label: "Ativo" }, { value: "inativo", label: "Inativo" }];
App.register("clients", {
  title: "Clientes",
  async render(el) {
    await new Crud(el, {
      table: "clients", select: "*, companies(trade_name,legal_name)", title: "Clientes", subtitle: "Gerencie sua base de clientes e contatos.",
      singular: "cliente", newLabel: "Novo cliente", icon: "users", csvName: "clientes", emptyText: "Cadastre seu primeiro cliente para começar a construir o histórico comercial.",
      detailTitle: (r) => r.full_name, sortCol: 0, sortDir: 1,
      search: (r) => [r.full_name, r.email, r.phone, r.document, r.city].join(" "),
      filters: [{ name: "status", label: "Situação", options: ST }, { name: "type", label: "Tipo", options: Utils.opts(["pessoa_fisica", "pessoa_juridica"]) }],
      columns: [
        { label: "Nome", v: (r) => r.full_name, html: (r) => `<b>${Utils.esc(r.full_name)}</b><div class="muted">${Utils.esc(r.email || "")}</div>` },
        { label: "Telefone", v: (r) => r.phone || "" },
        { label: "Empresa", v: (r) => r.companies ? r.companies.trade_name || r.companies.legal_name : "" },
        { label: "Cidade/UF", v: (r) => [r.city, r.state].filter(Boolean).join("/") },
        { label: "Situação", v: (r) => r.status, html: (r) => Utils.badge(r.status) },
        { label: "Cadastro", v: (r) => r.created_at.slice(0, 10), html: (r) => Utils.date(r.created_at) }],
      fields: [
        { name: "full_name", label: "Nome completo", required: true, full: true },
        { name: "email", label: "E-mail", type: "email" }, { name: "phone", label: "Telefone", type: "tel", mask: "phone" },
        { name: "type", label: "Tipo", type: "select", options: Utils.opts(["pessoa_fisica", "pessoa_juridica"]), default: "pessoa_fisica", required: true },
        { name: "document", label: "CPF/CNPJ", mask: "document" },
        { name: "company_id", label: "Empresa vinculada", type: "select", lookup: Crud.LK.companies },
        { name: "status", label: "Situação", type: "select", options: ST, default: "ativo", required: true },
        { name: "city", label: "Cidade" }, { name: "state", label: "Estado (UF)", maxlength: 2 },
        { name: "address", label: "Endereço", full: true }, { name: "notes", label: "Observações", type: "textarea", full: true }],
      async detailExtra(r) {
        const [a, o, t] = await Promise.all([
          db.from("activities").select("description,created_at").eq("client_id", r.id).order("created_at", { ascending: false }).limit(8),
          db.from("opportunities").select("name,stage,estimated_value").eq("client_id", r.id),
          db.from("tasks").select("title,status").eq("client_id", r.id)]);
        const list = (rows, fn, empty) => rows?.length ? `<ul class="plain">${rows.map(fn).join("")}</ul>` : `<p class="muted">${empty}</p>`;
        return `<h4>Oportunidades</h4>${list(o.data, (x) => `<li>${Utils.esc(x.name)} ${Utils.badge(x.stage)} · ${Utils.currency(x.estimated_value)}</li>`, "Nenhuma oportunidade.")}
          <h4>Tarefas</h4>${list(t.data, (x) => `<li>${Utils.esc(x.title)} ${Utils.badge(x.status)}</li>`, "Nenhuma tarefa.")}
          <h4>Histórico de atividades</h4>${list(a.data, (x) => `<li>${Utils.esc(x.description)} <span class="muted">· ${Utils.date(x.created_at)}</span></li>`, "Sem atividades registradas.")}`;
      }
    }).init();
  }
});
