// Relatórios gerenciais com filtro de período e exportação CSV.
App.register("reports", {
  title: "Relatórios",
  async render(el) {
    const y = new Date().getFullYear(), st = { from: y + "-01-01", to: Utils.today() };
    el.innerHTML = `<div class="page-head"><div><h1>Relatórios gerenciais</h1><p class="muted">Dados reais do período selecionado.</p></div>
      <div class="actions period"><label class="inline">De <input type="date" id="r-from" value="${st.from}"></label><label class="inline">até <input type="date" id="r-to" value="${st.to}"></label><button class="btn" id="r-go">Aplicar</button></div></div><div id="r-out"></div>`;
    const out = el.querySelector("#r-out"), go = async () => {
      const f = el.querySelector("#r-from").value, t = el.querySelector("#r-to").value; if (!f || !t || f > t) return Utils.toast("Período inválido.", "error");
      out.innerHTML = '<div class="loading-box"><span class="spinner"></span> Gerando…</div>'; App.charts.forEach((c) => c.destroy()); App.charts = [];
      const [s, c, o, k] = await Promise.all([
        db.from("sales").select("*, clients(full_name), profiles(full_name)").gte("sale_date", f).lte("sale_date", t),
        db.from("clients").select("*").gte("created_at", f).lte("created_at", t + "T23:59:59"),
        db.from("opportunities").select("*, clients(full_name), profiles(full_name)").gte("opened_at", f).lte("opened_at", t),
        db.from("tasks").select("*, profiles(full_name)").gte("created_at", f).lte("created_at", t + "T23:59:59")]);
      for (const r of [s, c, o, k]) if (r.error) return Utils.toast(Utils.friendlyError(r.error), "error");
      const ok = s.data.filter((x) => x.status === "concluida"), sum = (a, k2) => a.reduce((n, x) => n + Number(x[k2]), 0), won = o.data.filter((x) => x.stage === "ganho").length, lost = o.data.filter((x) => x.stage === "perdido").length;
      const late = k.data.filter((x) => ["pendente", "em_andamento"].includes(x.status) && x.due_date && x.due_date < Utils.today()).length, perf = {};
      ok.forEach((x) => { const n = x.profiles?.full_name || "Sem responsável"; (perf[n] ||= { v: 0, q: 0, g: 0 }); perf[n].v += Number(x.amount); perf[n].q++; });
      o.data.filter((x) => x.stage === "ganho").forEach((x) => { const n = x.profiles?.full_name || "Sem responsável"; (perf[n] ||= { v: 0, q: 0, g: 0 }); perf[n].g++; });
      const sec = (title, kpis, extra, btn) => `<div class="card"><div class="sec-head"><h3>${title}</h3><button class="btn ghost sm" data-csv="${btn}"><i data-lucide="download"></i>CSV</button></div><div class="mini-kpis">${kpis.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("")}</div>${extra}</div>`;
      out.innerHTML = sec("Relatório de vendas", [["Vendas concluídas", ok.length], ["Valor vendido", Utils.currency(sum(ok, "amount"))], ["Ticket médio", Utils.currency(ok.length ? sum(ok, "amount") / ok.length : 0)], ["Canceladas", s.data.filter((x) => x.status === "cancelada").length]], '<div class="chart sm"><canvas id="rc1"></canvas></div>', "sales")
        + sec("Relatório de clientes", [["Novos clientes", c.data.length], ["Ativos", c.data.filter((x) => x.status === "ativo").length], ["Inativos", c.data.filter((x) => x.status === "inativo").length]], "", "clients")
        + sec("Relatório de oportunidades", [["Criadas", o.data.length], ["Ganhas", won], ["Perdidas", lost], ["Conversão", won + lost ? Math.round(won / (won + lost) * 100) + "%" : "—"], ["Valor em aberto", Utils.currency(sum(o.data.filter((x) => !["ganho", "perdido"].includes(x.stage)), "estimated_value"))]], '<div class="chart sm"><canvas id="rc2"></canvas></div>', "opps")
        + sec("Relatório de tarefas", [["Criadas", k.data.length], ["Concluídas", k.data.filter((x) => x.status === "concluida").length], ["Atrasadas", late]], "", "tasks")
        + sec("Desempenho comercial", [["Responsáveis", Object.keys(perf).length]], Object.keys(perf).length ? `<div class="table-wrap"><table><thead><tr><th>Responsável</th><th>Vendas</th><th>Valor</th><th>Oport. ganhas</th></tr></thead><tbody>${Object.entries(perf).sort((a, b) => b[1].v - a[1].v).map(([n, p]) => `<tr><td>${Utils.esc(n)}</td><td>${p.q}</td><td>${Utils.currency(p.v)}</td><td>${p.g}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Sem dados no período.</p>', "perf");
      const months = [...new Set(ok.map((x) => x.sale_date.slice(0, 7)))].sort();
      App.chart(out.querySelector("#rc1"), { type: "bar", data: { labels: months.map(Utils.monthName), datasets: [{ data: months.map((m) => sum(ok.filter((x) => x.sale_date.startsWith(m)), "amount")), backgroundColor: App.palette[1], borderRadius: 4 }] }, options: { plugins: { legend: { display: false } } } });
      App.chart(out.querySelector("#rc2"), { type: "bar", data: { labels: Utils.STAGES.map(Utils.label), datasets: [{ data: Utils.STAGES.map((x) => o.data.filter((r) => r.stage === x).length), backgroundColor: App.palette[0], borderRadius: 4 }] }, options: { plugins: { legend: { display: false } } } });
      const E = { sales: () => Utils.csv("relatorio-vendas", ["Nº", "Cliente", "Responsável", "Data", "Valor", "Status"], s.data.map((x) => [x.sale_number, x.clients?.full_name, x.profiles?.full_name, x.sale_date, x.amount, Utils.label(x.status)])),
        clients: () => Utils.csv("relatorio-clientes", ["Nome", "E-mail", "Telefone", "Cidade", "UF", "Situação", "Cadastro"], c.data.map((x) => [x.full_name, x.email, x.phone, x.city, x.state, Utils.label(x.status), x.created_at.slice(0, 10)])),
        opps: () => Utils.csv("relatorio-oportunidades", ["Nome", "Cliente", "Responsável", "Valor", "Etapa", "Probabilidade"], o.data.map((x) => [x.name, x.clients?.full_name, x.profiles?.full_name, x.estimated_value, Utils.label(x.stage), x.probability])),
        tasks: () => Utils.csv("relatorio-tarefas", ["Título", "Responsável", "Vencimento", "Prioridade", "Status"], k.data.map((x) => [x.title, x.profiles?.full_name, x.due_date, Utils.label(x.priority), Utils.label(x.status)])),
        perf: () => Utils.csv("desempenho-comercial", ["Responsável", "Vendas", "Valor", "Oportunidades ganhas"], Object.entries(perf).map(([n, p]) => [n, p.q, p.v, p.g])) };
      out.querySelectorAll("[data-csv]").forEach((b) => (b.onclick = E[b.dataset.csv])); lucide.createIcons();
    };
    el.querySelector("#r-go").onclick = go; await go();
  }
});
