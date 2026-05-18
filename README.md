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
