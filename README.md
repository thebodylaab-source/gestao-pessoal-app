# Gestão Pessoal

App privada em HTML/CSS/JavaScript para gerir finanças, tempo, investimentos, orçamento e créditos.

## Desenvolvimento

```powershell
npm.cmd install
npm.cmd run dev
```

## Build

```powershell
npm.cmd run build
```

## Cloud Supabase

A app continua a guardar uma copia local no browser, mas quando fizer login no botao `Cloud`, sincroniza o estado completo com Supabase.
Cada utilizador Cloud tem uma linha separada por `user_id` e uma cache local separada no browser, evitando mistura de dados entre contas.

1. No Supabase, abra `SQL Editor`.
2. Cole e execute o conteudo de `supabase/schema.sql`.
3. Em `Authentication > Providers`, confirme que `Email` esta ativo.
4. Em `Authentication > URL Configuration`, adicione o URL de producao da Vercel nos redirects permitidos, se o Supabase pedir.
5. No Vercel, configure:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

O ficheiro `.env.local` pode ser usado em desenvolvimento, mas nao deve ser enviado para GitHub.

## Deploy

O projeto está pronto para Vercel como site estático/Vite.

Produção atual:

https://gestao-pessoal-app-eta.vercel.app

```powershell
npm.cmd run deploy
```

## GitHub

```powershell
& 'C:\Program Files\Git\cmd\git.exe' remote add origin https://github.com/UTILIZADOR/gestao-pessoal-app.git
& 'C:\Program Files\Git\cmd\git.exe' branch -M main
& 'C:\Program Files\Git\cmd\git.exe' push -u origin main
```

Nota: a pasta `backups/` está excluída do Git e da Vercel porque contém o HTML original.
