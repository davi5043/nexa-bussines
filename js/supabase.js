// Cria o cliente Supabase único usado por todo o sistema.
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.NEXA_CONFIG;
  window.nexaConfigured = !SUPABASE_URL.includes("SEU-PROJETO") && !SUPABASE_ANON_KEY.includes("SUA-CHAVE");
  window.db = window.nexaConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
})();
