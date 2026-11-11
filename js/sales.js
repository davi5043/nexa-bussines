// Módulo Vendas
const PAY = Utils.opts(["pix", "boleto", "cartao_credito", "cartao_debito", "transferencia", "dinheiro"]);
const SALE_ST = Utils.opts(["pendente", "concluida", "cancelada"]);
App.register("sales", {
  title: "Vendas",
  async render(el) {
    await new Crud(el, {
      table: "sales", select: "*, clients(full_name), companies(trade_name,legal_name), profiles(full_name)", title: "Vendas", subtitle: "Registre e acompanhe as vendas realizadas.",
      singular: "venda", newLabel: "Registrar venda", icon: "receipt", csvName: "vendas", emptyText: "Registre sua primeira venda para alimentar os indicadores.",
      dateField: "sale_date", detailTitle: (r) => "Venda nº " + String(r.sale_number).padStart(5, "0"),
      search: (r) => [r.sale_number, r.clients?.full_name, r.companies?.trade_name].join(" "),
      filters: [{ name: "status", label: "Status", options: SALE_ST }],
      rowActions: [{ icon: "ban", title: "Cancelar venda", show: (r) => r.status !== "cancelada", run: (r, c) => Swal.fire({ title: "Cancelar esta venda?", icon: "warning", showCancelButton: true, confirmButtonText: "Cancelar venda", cancelButtonText: "Voltar", confirmButtonColor: "#c8382f" }).then((x) => x.isConfirmed && c.patch(r, { status: "cancelada" }, "Venda cancelada.")) }],
      columns: [
        { label: "Nº", v: (r) => r.sale_number, html: (r) => "<b>" + String(r.sale_number).padStart(5, "0") + "</b>" }, { label: "Cliente", v: (r) => r.clients?.full_name || "" },
        { label: "Responsável", v: (r) => r.profiles?.full_name || "" }, { label: "Data", v: (r) => r.sale_date, html: (r) => Utils.date(r.sale_date) },
        { label: "Pagamento", v: (r) => Utils.label(r.payment_method) }, { label: "Valor", v: (r) => Number(r.amount), html: (r) => Utils.currency(r.amount) },
        { label: "Status", v: (r) => r.status, html: (r) => Utils.badge(r.status) }],
      sortCol: 3, sortDir: -1,
      fields: [
        { name: "client_id", label: "Cliente", type: "select", lookup: Crud.LK.clients, required: true }, { name: "company_id", label: "Empresa", type: "select", lookup: Crud.LK.companies },
        { name: "opportunity_id", label: "Oportunidade relacionada", type: "select", lookup: Crud.LK.opportunities },
        { name: "owner_id", label: "Responsável", type: "select", lookup: Crud.LK.profiles, default: () => App.profile.id },
        { name: "amount", label: "Valor (R$)", type: "number", step: "0.01", required: true, fmt: Utils.currency },
        { name: "sale_date", label: "Data", type: "date", default: Utils.today, required: true },
        { name: "payment_method", label: "Forma de pagamento", type: "select", options: PAY }, { name: "status", label: "Status", type: "select", options: SALE_ST, default: "concluida", required: true },
        { name: "notes", label: "Observações", type: "textarea", full: true }]
    }).init();
  }
});
