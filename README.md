# link — módulo 1 (versão revista)

MVP para UP-Maputo: cadastro por **formato** de código `01.XXXX.XXXX`, login, pedidos de conexão, chat individual (unicast), grupos (multicast) e mensagens via Supabase Realtime.

> IMPORTANTE: O formato do código **não comprova** matrícula na UP-Maputo. Este MVP não faz verificação institucional. Não o apresentes como acesso exclusivo comprovado.

## 1. Requisitos
- Node.js 20.9+ (recomendado Node.js 22 LTS)
- npm
- Projecto Supabase com Auth por email
- Ligação à internet para `npm install`

## 2. Instalação (PowerShell)
```powershell
cd D:\Dev\link-project
npm install
Copy-Item .env.example .env.local
```
Editar `.env.local` com o **Project URL** e a **Publishable key** do Supabase.
Usar `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...` conforme o código. Nunca inserir `sb_secret_...`.

## 3. SQL
Abrir Supabase > SQL Editor e executar `supabase/schema.sql` **uma vez, num esquema public limpo**.
O script cria tabelas, funções, triggers, políticas RLS e publicação Realtime.
Não executar repetidamente sobre as mesmas tabelas.

Se aparecer `relation ... already exists`, o esquema já contém objectos: não executar `DROP SCHEMA ... CASCADE` sem confirmar os dados a preservar.

Se existir um trigger antigo `user_created` em `auth.users`, o script desta versão cria **link_user_created** para evitar conflito de nome, MAS **o trigger antigo continuará a executar**. Se o antigo apontar para tabelas eliminadas, pode impedir o registo. Inspecciona antes:
```sql
select t.tgname, pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
```
Só se souberes que `user_created` é antigo e não é usado por outra aplicação:
```sql
drop trigger if exists user_created on auth.users;
```
Não apagar contas de `auth.users` automaticamente. Reutilizar um projecto antigo pode deixar funções e contas anteriores.

## 4. Autenticação
Supabase > Authentication > Providers > Email: activa o email.
Se a confirmação por email estiver activa, configura os URLs de redireccionamento (ex.: `http://localhost:3000/login` ou a porta que o Next.js usar).
O registo usa metadata para o trigger criar a linha em `students`.

## 5. Executar
```powershell
npm run dev
```
Abrir o endereço indicado no terminal, depois `/cadastro`.
Para testar mensagens, criar **duas contas diferentes** (emails e códigos distintos), confirmar email se solicitado, iniciar sessão em dois navegadores, criar e aceitar conexão, e conversar.

## 6. Funcionalidades incluídas
- `/cadastro`: nome, código, email e palavra-passe
- `/login`: autenticação
- `/conexoes`: descobrir estudantes e pedir/aceitar conexões
- `/mensagens`: conversas individuais e grupos entre conexões aceites
- `/`: entrada autenticada

## 7. Limitações
- Sem verificação institucional real, anexos, chamadas, notificações push ou encriptação ponta-a-ponta.
- Interface funcional básica, não design final do Figma.
- O Supabase Realtime precisa de estar habilitado para a tabela `messages` (o SQL tenta habilitá-lo).
- Segurança do chat baseada em Auth + RLS; requer testes antes de uso público.
- O projecto foi revisto estaticamente, **não foi testado contra uma instância Supabase real**.

## 8. Problemas frequentes
- `db is not a function`: substitui `src/lib/supabase.ts` e `src/components/Guard.tsx` pelos desta versão.
- `Configura ... .env.local`: cria o ficheiro na raiz, não dentro de `src`; reinicia `npm run dev`.
- `trigger ... already exists`: verifica triggers antigos no `auth.users` com a consulta acima.
- `ENETUNREACH`: problema de acesso ao registry npm; verifica ligação.
