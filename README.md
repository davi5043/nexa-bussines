# NEXA BUSINESS — CRM/SaaS de gestão empresarial

Sistema feito com **HTML, CSS e JavaScript puro**, usando o **Supabase** como banco de dados e login.
Módulos: visão geral (dashboard), clientes, empresas, oportunidades (Kanban), vendas, tarefas, relatórios e configurações.

> **Glossário rápido**
> - **Banco de dados**: um "arquivo gigante organizado em planilhas" (chamadas *tabelas*) onde ficam os dados.
> - **Supabase**: serviço gratuito que hospeda o banco de dados e o sistema de login.
> - **SQL**: a linguagem que cria e consulta tabelas. Você só vai copiar e colar, sem precisar aprender.
> - **Frontend**: as telas que você vê no navegador.
> - **Chave anon/publishable**: chave *pública* que identifica seu projeto. Pode ficar no código; a proteção real vem das regras de segurança (RLS).
> - **RLS (Row Level Security)**: regra no banco que garante que cada empresa só enxergue os próprios dados.
> - **Deploy / hospedagem**: colocar o site no ar na internet.

## 1. Instalar o Visual Studio Code
Baixe em https://code.visualstudio.com, instale e abra.

## 2. Abrir a pasta do projeto
Descompacte o ZIP. No VS Code: **File → Open Folder** e escolha a pasta `NEXA-BUSINESS`.

## 3. Instalar a extensão Live Server
Ícone de quadradinhos na barra lateral (Extensions) → pesquise **Live Server** (Ritwick Dey) → **Install**.

## 4. Criar conta no Supabase
Acesse https://supabase.com → **Start your project** → entre com GitHub ou e-mail.

## 5. Criar um projeto
**New project** → dê um nome (ex.: `nexa`), crie uma senha forte para o banco (guarde-a), escolha a região mais próxima (South America) → **Create**. Aguarde 1–2 minutos.

## 6. Configurar o banco com o arquivo SQL
1. No menu lateral do Supabase, abra **SQL Editor** → **New query**.
2. Abra `supabase/supabase_setup.sql` no VS Code, copie **tudo** (Ctrl+A, Ctrl+C).
3. Cole no editor do Supabase e clique em **Run**. Deve aparecer "Success".
Pode rodar de novo sem problemas se precisar.

## 7. Encontrar a URL e a chave pública
**Project Settings (engrenagem) → API** (em algumas versões, **API Keys**):
- **Project URL** (algo como `https://abcd1234.supabase.co`);
- chave **anon / publishable**. **Nunca** use a `service_role` / `secret`.

## 8. Colocar no `js/config.js`
Substitua os dois valores entre aspas e salve.

## 9. Executar o sistema
Clique com o botão direito em `login.html` → **Open with Live Server**.

## 10. Cadastrar o primeiro usuário
Abra `cadastro.html` (link "Criar conta"), informe nome, nome da empresa, e-mail e senha.
O primeiro usuário vira **Administrador** da conta. Se o Supabase exigir confirmação de e-mail, clique no link recebido.
Para testar sem e-mail: **Authentication → Providers → Email → desative "Confirm email"**.

**Colaboradores:** em **Configurações** o administrador vê o *código de convite*. Quem se cadastrar informando esse código entra na mesma empresa como Colaborador (não exclui registros, exceto tarefas, e não gerencia a equipe).

## 11. Ver os dados no Supabase
**Table Editor** → escolha a tabela (`clients`, `sales`, `tasks`...). Funciona como uma planilha.

## 12. Editar e excluir direto no banco
No Table Editor: clique numa célula para editar; botão direito na linha → **Delete row**; **Insert → Insert row** para adicionar.
Atenção: campos como `status` e `stage` só aceitam valores válidos (ex.: `ativo`/`inativo`) e o campo `tenant_id` deve ser o da sua conta.

## 13. Publicar no GitHub
1. Crie conta em https://github.com e um repositório novo (**New repository**).
2. No terminal do VS Code (Ctrl+`):
```
git init
git add .
git commit -m "NEXA BUSINESS"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/nexa-business.git
git push -u origin main
```
(Instale o Git em https://git-scm.com se necessário.)

## 14. Hospedar (Vercel, gratuito)
1. https://vercel.com → entre com o GitHub → **Add New → Project** → escolha o repositório.
2. *Framework Preset*: **Other**. Deixe Build Command vazio e Output Directory vazio. **Deploy**.
3. **Variáveis de conexão:** como o site é estático (sem build), a URL e a chave pública ficam no `js/config.js` mesmo — é seguro, pois são públicas e o RLS protege os dados.
4. No Supabase, em **Authentication → URL Configuration**, coloque o endereço da Vercel em *Site URL* (necessário para os e-mails de confirmação e recuperação de senha).
Na Vercel, a página inicial é `index.html`; se não estiver logado, o sistema redireciona para `login.html`.

## 15. Atualizar o site depois de alterações
Edite os arquivos e rode `git add . && git commit -m "ajuste" && git push`. A Vercel republica sozinha.

## Segurança (resumo simples)
- Todas as tabelas têm RLS ligado. Cada registro guarda o `tenant_id` (empresa-conta) e as políticas só permitem acessar linhas da própria conta.
- Excluir registros: só administradores (tarefas: qualquer membro).
- Colaborador não consegue se promover a administrador (há um gatilho no banco que bloqueia).
- O frontend usa apenas a chave pública.

## Estrutura
`index.html` (app) · `login.html` · `cadastro.html` · `css/` · `js/` (um arquivo por módulo; `crud.js` é o motor comum de tabelas/formulários) · `supabase/supabase_setup.sql`

## Limitações conhecidas
- Código escrito sem teste em navegador real; a sintaxe do JavaScript foi verificada, mas pode haver ajustes finos ao rodar. Se algo falhar, abra o Console do navegador (F12) e envie a mensagem de erro.
- As listas carregam os registros em memória (até ~1000 por tabela, limite padrão do Supabase). Para volumes maiores, seria preciso paginar no servidor.
- Os ícones (Lucide), gráficos e alertas vêm de CDN: precisa de internet.
- A exportação CSV usa ponto e vírgula e abre direto no Excel em português.

## Problemas comuns
| Sintoma | Solução |
|---|---|
| Aviso "Configure js/config.js" | URL/chave não preenchidas ou com aspas erradas. |
| "Failed to fetch" | URL incorreta ou sem internet. |
| "Invalid login" | E-mail/senha errados ou e-mail não confirmado. |
| Tela em branco após login / erro ao carregar perfil | O SQL não foi executado por completo. Rode-o de novo. Usuários criados *antes* do SQL não têm perfil: apague-os em Authentication → Users e cadastre de novo. |
| "Database error saving new user" | Código de convite inválido, ou SQL incompleto. |
| Não consigo excluir um registro | Só administradores excluem. |
| Live Server não abre | Confirme a extensão instalada e clique com o botão direito no HTML. |
