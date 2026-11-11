// Configurações: perfil, senha e (para administradores) empresa e equipe.
App.register("settings", {
  title: "Configurações",
  async render(el) {
    const p = App.profile, admin = p.role === "administrador";
    const [team, ten] = await Promise.all([db.from("profiles").select("id,full_name,role,created_at").order("created_at"), db.from("tenants").select("name,invite_code").single()]);
    if (team.error) throw team.error;
    el.innerHTML = `<div class="page-head"><div><h1>Configurações</h1><p class="muted">Conta, empresa e equipe.</p></div></div><div class="grid2">
      <div class="card"><h3>Meu perfil</h3><form id="f-profile"><div class="field"><label>Nome completo</label><input name="full_name" value="${Utils.esc(p.full_name)}" required></div>
        <div class="field"><label>E-mail</label><input value="${Utils.esc(p.email)}" disabled></div><button class="btn" type="submit">Salvar</button></form></div>
      <div class="card"><h3>Alterar senha</h3><form id="f-pass"><div class="field"><label>Nova senha (mín. 6)</label><input name="pw" type="password" minlength="6" required autocomplete="new-password"></div><button class="btn" type="submit">Atualizar senha</button></form></div>
      ${admin ? `<div class="card"><h3>Empresa</h3><form id="f-tenant"><div class="field"><label>Nome da empresa</label><input name="name" value="${Utils.esc(ten.data?.name)}" required></div><button class="btn" type="submit">Salvar</button></form>
        <hr><div class="field"><label>Código de convite (para colaboradores)</label><input readonly value="${Utils.esc(ten.data?.invite_code)}" id="invite"></div>
        <p class="muted">Quem se cadastrar em <b>cadastro.html</b> informando este código entra como colaborador.</p></div>` : ""}</div>
      <div class="card"><h3>Equipe</h3><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Acesso</th><th>Desde</th></tr></thead><tbody>${team.data.map((u) => `<tr><td>${Utils.esc(u.full_name || "Sem nome")}</td>
        <td>${admin && u.id !== p.id ? `<select data-role="${u.id}">${["administrador", "colaborador"].map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${Utils.label(r)}</option>`).join("")}</select>` : Utils.badge(u.role)}</td><td>${Utils.date(u.created_at)}</td></tr>`).join("")}</tbody></table></div></div>`;
    const run = async (q, msg) => { const { error } = await q; error ? Utils.toast(Utils.friendlyError(error), "error") : Utils.toast(msg); return !error; };
    el.querySelector("#f-profile").onsubmit = async (e) => { e.preventDefault(); const n = e.target.full_name.value.trim();
      if (await run(db.from("profiles").update({ full_name: n }).eq("id", p.id), "Perfil atualizado.")) { p.full_name = n; document.getElementById("uname").textContent = n; } };
    el.querySelector("#f-pass").onsubmit = async (e) => { e.preventDefault(); if (await run(db.auth.updateUser({ password: e.target.pw.value }), "Senha atualizada.")) e.target.reset(); };
    el.querySelector("#f-tenant")?.addEventListener("submit", async (e) => { e.preventDefault(); const n = e.target.name.value.trim();
      if (await run(db.from("tenants").update({ name: n }).eq("id", p.tenant_id), "Empresa atualizada.")) document.getElementById("tenant-name").textContent = n; });
    el.querySelectorAll("[data-role]").forEach((s) => (s.onchange = () => run(db.from("profiles").update({ role: s.value }).eq("id", s.dataset.role), "Acesso atualizado.")));
  }
});
