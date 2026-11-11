// Módulo Empresas
App.register("companies", {
  title: "Empresas",
  async render(el) {
    await new Crud(el, {
      table: "companies", title: "Empresas", subtitle: "Empresas clientes e parceiras, com seus contatos.", singular: "empresa", newLabel: "Nova empresa",
      icon: "building-2", csvName: "empresas", emptyText: "Cadastre as empresas com as quais você se relaciona.", detailTitle: (r) => r.trade_name || r.legal_name,
      sortCol: 0, sortDir: 1, search: (r) => [r.legal_name, r.trade_name, r.cnpj, r.email, r.city, r.contact_person].join(" "),
      columns: [
        { label: "Empresa", v: (r) => r.trade_name || r.legal_name, html: (r) => `<b>${Utils.esc(r.trade_name || r.legal_name)}</b><div class="muted">${Utils.esc(r.legal_name)}</div>` },
        { label: "CNPJ", v: (r) => r.cnpj || "" }, { label: "Responsável", v: (r) => r.contact_person || "" },
        { label: "Telefone", v: (r) => r.phone || "" }, { label: "Cidade/UF", v: (r) => [r.city, r.state].filter(Boolean).join("/") }],
      fields: [
        { name: "legal_name", label: "Razão social", required: true }, { name: "trade_name", label: "Nome fantasia" },
        { name: "cnpj", label: "CNPJ", mask: "document" }, { name: "contact_person", label: "Responsável" },
        { name: "email", label: "E-mail", type: "email" }, { name: "phone", label: "Telefone", type: "tel", mask: "phone" },
        { name: "address", label: "Endereço", full: true }, { name: "city", label: "Cidade" }, { name: "state", label: "Estado (UF)", maxlength: 2 },
        { name: "notes", label: "Observações", type: "textarea", full: true }],
      async detailExtra(r) {   // contatos (clientes) vinculados à empresa
        const { data } = await db.from("clients").select("full_name,email,phone").eq("company_id", r.id);
        return `<h4>Contatos vinculados</h4>${data?.length ? `<ul class="plain">${data.map((c) => `<li>${Utils.esc(c.full_name)} <span class="muted">${Utils.esc([c.email, c.phone].filter(Boolean).join(" · "))}</span></li>`).join("")}</ul>` : '<p class="muted">Nenhum contato vinculado. Vincule clientes a esta empresa no cadastro de clientes.</p>'}`;
      }
    }).init();
  }
});
