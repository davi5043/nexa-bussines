// Núcleo do sistema: roteador, layout, modais e gráficos.
const App = {
  routes: {}, profile: null, charts: [], pendingSearch: "",
  register(name, mod) { this.routes[name] = mod; },

  async init() {
    if (!(await Auth.requireSession())) return;
    try { this.profile = await Auth.getProfile(); }
    catch (e) { return Utils.toast(Utils.friendlyError(e), "error"); }
    const p = this.profile, name = p.full_name || p.email;
    document.getElementById("uname").textContent = name;
    document.getElementById("avatar").textContent = name.trim().charAt(0).toUpperCase();
    document.getElementById("tenant-name").textContent = p.tenants?.name || "";
    document.getElementById("role-name").textContent = Utils.label(p.role);
    this.bindShell();
    window.addEventListener("hashchange", () => this.route());
    this.route(); this.refreshBell();
  },

  bindShell() {
    const $ = (id) => document.getElementById(id), side = $("sidebar"), back = $("backdrop");
    const toggle = (on) => { side.classList.toggle("open", on); back.classList.toggle("show", on); };
    $("menu-btn").onclick = () => toggle(!side.classList.contains("open"));
    back.onclick = () => toggle(false);
    $("user-btn").onclick = (e) => { e.stopPropagation(); $("dropdown").hidden = !$("dropdown").hidden; };
    document.addEventListener("click", () => ($("dropdown").hidden = true));
    $("logout").onclick = () => Auth.signOut();
    $("bell").onclick = () => (location.hash = "#/tasks");
    $("global-search").onsubmit = (e) => { e.preventDefault(); this.pendingSearch = e.target.q.value.trim(); e.target.reset();
      location.hash === "#/clients" ? this.route() : (location.hash = "#/clients"); };
    this.closeMenu = () => toggle(false);
  },

  async refreshBell() {   // sino = tarefas atrasadas (dado real)
    const { count } = await db.from("tasks").select("id", { count: "exact", head: true })
      .in("status", ["pendente", "em_andamento"]).lt("due_date", Utils.today());
    const dot = document.getElementById("bell-dot"); dot.hidden = !count; dot.textContent = count || "";
  },

  async route() {
    const name = (location.hash.replace("#/", "") || "dashboard").split("?")[0];
    const mod = this.routes[name] || this.routes.dashboard, key = this.routes[name] ? name : "dashboard";
    document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === key));
    document.getElementById("page-title").textContent = mod.title;
    this.charts.forEach((c) => c.destroy()); this.charts = [];
    const view = document.getElementById("view");
    view.innerHTML = '<div class="loading-box"><span class="spinner"></span> Carregando…</div>';
    try { await mod.render(view); }
    catch (e) { view.innerHTML = `<div class="empty"><h3>Algo deu errado</h3><p>${Utils.esc(Utils.friendlyError(e))}</p></div>`; }
    lucide.createIcons(); this.closeMenu?.(); window.scrollTo(0, 0);
  },

  modal({ title, body, footer = "", wide = false }) {
    const o = document.createElement("div"); o.className = "modal-overlay";
    o.innerHTML = `<div class="modal${wide ? " wide" : ""}"><div class="modal-head"><h3>${Utils.esc(title)}</h3>
      <button class="icon-btn" data-close aria-label="Fechar"><i data-lucide="x"></i></button></div>
      <div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ""}</div>`;
    document.body.appendChild(o); lucide.createIcons();
    const close = () => o.remove();
    o.addEventListener("mousedown", (e) => { if (e.target === o || e.target.closest("[data-close]")) close(); });
    return { el: o, close };
  },

  chart(canvas, config) {
    Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif'; Chart.defaults.color = "#6b7a8a";
    const c = new Chart(canvas, { ...config, options: { responsive: true, maintainAspectRatio: false, ...(config.options || {}) } });
    this.charts.push(c); return c;
  },
  palette: ["#0a2540", "#0b6bcb", "#1a9e6b", "#5aa9e6", "#8fa6bd", "#e0a030", "#c8382f"]
};
document.addEventListener("DOMContentLoaded", () => App.init());
