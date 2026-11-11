// Módulo Tarefas
const isOpen = (r) => ["pendente", "em_andamento"].includes(r.status);
const isLate = (r) => isOpen(r) && r.due_date && r.due_date < Utils.today();
App.register("tasks", {
  title: "Tarefas",
  async render(el) {
    const soon = () => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
    await new Crud(el, {
      table: "tasks", select: "*, clients(full_name), profiles(full_name)", title: "Tarefas", subtitle: "Organize as atividades da equipe.", singular: "tarefa", newLabel: "Nova tarefa",
      icon: "check-square", csvName: "tarefas", emptyText: "Crie tarefas para acompanhar o que precisa ser feito.", deleteAll: true, detailTitle: (r) => r.title,
      rowClass: (r) => (isLate(r) ? "overdue" : ""), search: (r) => [r.title, r.clients?.full_name, r.profiles?.full_name].join(" "),
      filters: [
        { name: "status", label: "Status", options: Utils.opts(["pendente", "em_andamento", "concluida", "cancelada"]) },
        { name: "priority", label: "Prioridade", options: Utils.opts(["baixa", "media", "alta", "urgente"]) },
        { name: "prazo", label: "Prazo", options: [{ value: "vencidas", label: "Vencidas" }, { value: "proximas", label: "Próximas do vencimento (7 dias)" }, { value: "concluidas", label: "Concluídas" }],
          fn: (r, v) => (v === "vencidas" ? isLate(r) : v === "proximas" ? isOpen(r) && r.due_date && r.due_date >= Utils.today() && r.due_date <= soon() : r.status === "concluida") }],
      rowActions: [{ icon: "check-circle-2", title: "Marcar como concluída", show: isOpen, run: (r, c) => c.patch(r, { status: "concluida" }, "Tarefa concluída.") }],
      sortCol: 3, sortDir: 1,
      columns: [
        { label: "Título", v: (r) => r.title, html: (r) => `<b>${Utils.esc(r.title)}</b>${isLate(r) ? ' <span class="badge red">Atrasada</span>' : ""}` },
        { label: "Responsável", v: (r) => r.profiles?.full_name || "" }, { label: "Cliente", v: (r) => r.clients?.full_name || "" },
        { label: "Vencimento", v: (r) => r.due_date || "9999", html: (r) => Utils.date(r.due_date), csv: (r) => r.due_date || "" },
        { label: "Prioridade", v: (r) => r.priority, html: (r) => Utils.badge(r.priority) }, { label: "Status", v: (r) => r.status, html: (r) => Utils.badge(r.status) }],
      fields: [
        { name: "title", label: "Título", required: true, full: true }, { name: "description", label: "Descrição", type: "textarea", full: true },
        { name: "assignee_id", label: "Responsável", type: "select", lookup: Crud.LK.profiles, default: () => App.profile.id }, { name: "client_id", label: "Cliente relacionado", type: "select", lookup: Crud.LK.clients },
        { name: "due_date", label: "Vencimento", type: "date" }, { name: "priority", label: "Prioridade", type: "select", options: Utils.opts(["baixa", "media", "alta", "urgente"]), default: "media", required: true },
        { name: "status", label: "Status", type: "select", options: Utils.opts(["pendente", "em_andamento", "concluida", "cancelada"]), default: "pendente", required: true }]
    }).init();
  }
});
