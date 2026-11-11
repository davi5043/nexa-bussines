// Funções utilitárias compartilhadas.
const Utils = {
  toast(message, type = "success") {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  },
  currency: (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  date: (d) => (d ? new Date(String(d).length === 10 ? d + "T00:00:00" : d).toLocaleDateString("pt-BR") : "—"),
  maskPhone(v) {
    v = v.replace(/\D/g, "").slice(0, 11);
    return v.length > 10 ? v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
                          : v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  },
  maskDocument(v) {
    v = v.replace(/\D/g, "").slice(0, 14);
    return v.length <= 11
      ? v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      : v.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  },
  friendlyError(err) {
    const m = (err && err.message) || "";
    if (m.includes("Invalid login")) return "E-mail ou senha incorretos.";
    if (m.includes("already registered")) return "Este e-mail já está cadastrado.";
    if (m.includes("Failed to fetch")) return "Sem conexão com o servidor. Verifique a internet e o config.js.";
    if (m.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if (m.includes("Database error saving")) return "Não foi possível criar a conta. Confira o código de convite.";
    if (m.includes("Password should")) return "A senha deve ter pelo menos 6 caracteres.";
    return m || "Ocorreu um erro inesperado.";
  }
};

Utils.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
Utils.L = { ativo: "Ativo", inativo: "Inativo", pessoa_fisica: "Pessoa física", pessoa_juridica: "Pessoa jurídica",
  novo_lead: "Novo lead", primeiro_contato: "Primeiro contato", em_negociacao: "Em negociação", proposta_enviada: "Proposta enviada",
  em_aprovacao: "Em aprovação", ganho: "Ganho", perdido: "Perdido", pendente: "Pendente", concluida: "Concluída", cancelada: "Cancelada",
  em_andamento: "Em andamento", baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente", pix: "PIX", boleto: "Boleto",
  cartao_credito: "Cartão de crédito", cartao_debito: "Cartão de débito", transferencia: "Transferência", dinheiro: "Dinheiro",
  administrador: "Administrador", colaborador: "Colaborador" };
Utils.STAGES = ["novo_lead", "primeiro_contato", "em_negociacao", "proposta_enviada", "em_aprovacao", "ganho", "perdido"];
Utils.label = (k) => Utils.L[k] || k || "—";
Utils.opts = (keys) => keys.map((k) => ({ value: k, label: Utils.label(k) }));
Utils.tone = (k) => ({ ativo: "green", concluida: "green", ganho: "green", inativo: "gray", cancelada: "gray", perdido: "red",
  urgente: "red", alta: "orange", pendente: "orange", em_andamento: "blue", media: "blue", baixa: "gray" }[k] || "blue");
Utils.badge = (k) => `<span class="badge ${Utils.tone(k)}">${Utils.esc(Utils.label(k))}</span>`;
Utils.today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
Utils.monthsBack = (n) => { const out = [], d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0")); } return out; };
Utils.monthName = (k) => new Date(k + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
Utils.csv = (name, headers, rows) => {   // separador ";" abre direto no Excel em português
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const text = "\ufeff" + [headers, ...rows].map((r) => r.map(q).join(";")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name + ".csv"; a.click(); URL.revokeObjectURL(a.href);
};
