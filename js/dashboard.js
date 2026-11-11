// Dashboard: indicadores calculados a partir dos dados reais do banco.
App.register("dashboard", {
  title: "Visão geral",
  async render(el) {
    const [c, o, s, t, a] = await Promise.all([
      db.from("clients").select("status,state"), db.from("opportunities").select("stage,estimated_value"),
      db.from("sales").select("amount,sale_date,status"), db.from("tasks").select("status"),
      db.from("activities").select("description,created_at").order("created_at", { ascending: false }).limit(8)]);
    for (const r of [c, o, s, t, a]) if (r.error) throw r.error;
    const sales = s.data.filter((x) => x.status === "concluida"), total = sales.reduce((n, x) => n + Number(x.amount), 0);
    const cards = [
      ["users", "Clientes cadastrados", c.data.length], ["target", "Oportunidades abertas", o.data.filter((x) => !["ganho", "perdido"].includes(x.stage)).length],
      ["receipt", "Vendas realizadas", sales.length], ["banknote", "Valor total vendido", Utils.currency(total)],
      ["handshake", "Negociações em andamento", o.data.filter((x) => ["em_negociacao", "proposta_enviada", "em_aprovacao"].includes(x.stage)).length],
      ["check-square", "Tarefas pendentes", t.data.filter((x) => ["pendente", "em_andamento"].includes(x.status)).length]];
    const empty = !c.data.length && !o.data.length && !s.data.length;
    el.innerHTML = `<div class="page-head"><div><h1>Olá, ${Utils.esc((App.profile.full_name || "").split(" ")[0] || "bem-vindo")}</h1><p class="muted">Resumo comercial de ${Utils.esc(App.profile.tenants?.name || "sua empresa")}.</p></div></div>
      ${empty ? `<div class="card welcome"><h3>Vamos começar?</h3><p>Seu painel está vazio. Cadastre seus primeiros dados e os indicadores aparecerão aqui automaticamente.</p>
        <div class="actions"><a class="btn" href="#/clients">Cadastrar cliente</a><a class="btn ghost" href="#/opportunities">Criar oportunidade</a></div></div>` : ""}
      <div class="kpis">${cards.map(([i, l, v]) => `<div class="card kpi"><i data-lucide="${i}"></i><div><span>${l}</span><b>${v}</b></div></div>`).join("")}</div>
      <div class="grid2"><div class="card"><h3>Vendas por mês</h3><div class="chart"><canvas id="ch1"></canvas></div></div>
        <div class="card"><h3>Evolução comercial (acumulado)</h3><div class="chart"><canvas id="ch2"></canvas></div></div>
        <div class="card"><h3>Oportunidades por etapa</h3><div class="chart"><canvas id="ch3"></canvas></div></div>
        <div class="card"><h3>Distribuição de clientes por estado</h3><div class="chart"><canvas id="ch4"></canvas></div></div></div>
      <div class="card"><h3>Atividades recentes</h3>${a.data.length ? `<ul class="plain feed">${a.data.map((x) => `<li>${Utils.esc(x.description)} <span class="muted">· ${Utils.date(x.created_at)}</span></li>`).join("")}</ul>` : '<p class="muted">Nenhuma atividade registrada ainda.</p>'}</div>`;
    const months = Utils.monthsBack(6), per = months.map((m) => sales.filter((x) => x.sale_date.startsWith(m)).reduce((n, x) => n + Number(x.amount), 0));
    let acc = sales.filter((x) => x.sale_date.slice(0, 7) < months[0]).reduce((n, x) => n + Number(x.amount), 0);
    const cum = per.map((v) => (acc += v)), labels = months.map(Utils.monthName), $ = (id) => el.querySelector("#" + id), P = App.palette;
    const noLegend = { plugins: { legend: { display: false } } };
    App.chart($("ch1"), { type: "bar", data: { labels, datasets: [{ data: per, backgroundColor: P[1], borderRadius: 4 }] }, options: noLegend });
    App.chart($("ch2"), { type: "line", data: { labels, datasets: [{ data: cum, borderColor: P[2], backgroundColor: "rgba(26,158,107,.12)", fill: true, tension: .3 }] }, options: noLegend });
    const st = Utils.STAGES.map((k) => o.data.filter((x) => x.stage === k).length);
    App.chart($("ch3"), { type: "doughnut", data: { labels: Utils.STAGES.map(Utils.label), datasets: [{ data: st, backgroundColor: ["#8fa6bd", "#5aa9e6", "#0b6bcb", "#0a2540", "#e0a030", "#1a9e6b", "#c8382f"] }] }, options: { plugins: { legend: { position: "right" } } } });
    const by = {}; c.data.forEach((x) => { const k = x.state ? x.state.toUpperCase() : "N/I"; by[k] = (by[k] || 0) + 1; });
    const top = Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 7);
    App.chart($("ch4"), { type: "bar", data: { labels: top.map((x) => x[0]), datasets: [{ data: top.map((x) => x[1]), backgroundColor: P[0], borderRadius: 4 }] }, options: { ...noLegend, indexAxis: "y" } });
  }
});
