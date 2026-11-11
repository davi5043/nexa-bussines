// Autenticação: login, cadastro, recuperação, logout e proteção de páginas.
const Auth = {
  async requireSession() {            // chame no topo das páginas internas
    if (!window.nexaConfigured) { location.href = "login.html"; return null; }
    const { data } = await db.auth.getSession();
    if (!data.session) { location.href = "login.html"; return null; }
    return data.session;
  },
  async redirectIfLogged() {
    if (!window.nexaConfigured) return;
    const { data } = await db.auth.getSession();
    if (data.session) location.href = "index.html";
  },
  async getProfile() {
    const { data: { user } } = await db.auth.getUser();
    const { data, error } = await db.from("profiles").select("*, tenants(name)").eq("id", user.id).single();
    if (error) throw error;
    return { ...data, email: user.email };
  },
  signIn: (email, password) => db.auth.signInWithPassword({ email, password }),
  signUp: (email, password, full_name, company_name, invite_code) =>
    db.auth.signUp({ email, password, options: { data: { full_name, company_name, invite_code } } }),
  resetPassword: (email) =>
    db.auth.resetPasswordForEmail(email, { redirectTo: location.href.replace(/[^/]*$/, "") + "login.html" }),
  async signOut() { await db.auth.signOut(); location.href = "login.html"; }
};

document.addEventListener("DOMContentLoaded", () => {
  const warn = document.getElementById("config-warning");
  if (warn && !window.nexaConfigured) warn.hidden = false;
  const busy = (btn, on) => { btn.disabled = on; btn.classList.toggle("loading", on); };

  const login = document.getElementById("form-login");
  if (login) {
    Auth.redirectIfLogged();
    login.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.nexaConfigured) return Utils.toast("Configure js/config.js primeiro.", "error");
      const btn = login.querySelector("button[type=submit]"); busy(btn, true);
      const { error } = await Auth.signIn(login.email.value.trim(), login.password.value);
      busy(btn, false);
      if (error) return Utils.toast(Utils.friendlyError(error), "error");
      location.href = "index.html";
    });
    document.getElementById("link-forgot")?.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const email = login.email.value.trim();
      if (!email) return Utils.toast("Digite seu e-mail acima para recuperar a senha.", "error");
      const { error } = await Auth.resetPassword(email);
      error ? Utils.toast(Utils.friendlyError(error), "error") : Utils.toast("Enviamos um link de recuperação para seu e-mail.");
    });
  }

  const signup = document.getElementById("form-signup");
  if (signup) {
    signup.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!window.nexaConfigured) return Utils.toast("Configure js/config.js primeiro.", "error");
      if (signup.password.value !== signup.confirm.value) return Utils.toast("As senhas não conferem.", "error");
      const btn = signup.querySelector("button[type=submit]"); busy(btn, true);
      const { data, error } = await Auth.signUp(signup.email.value.trim(), signup.password.value,
        signup.full_name.value.trim(), signup.company_name.value.trim(), signup.invite_code.value.trim());
      busy(btn, false);
      if (error) return Utils.toast(Utils.friendlyError(error), "error");
      if (data.session) location.href = "index.html";
      else { Utils.toast("Conta criada! Confirme o e-mail enviado para poder entrar."); setTimeout(() => location.href = "login.html", 2500); }
    });
  }
});
