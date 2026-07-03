# Release de Teste (Ponto 6)

## Objetivo
Gerar uma versão estável para testes internos (Android/iOS), com passos simples.

## 1) Pré-requisitos
- Node.js e npm instalados
- Expo CLI via `npx`
- Conta Expo autenticada: `npx expo login`

## 2) Arranque local (Expo Go)
```powershell
cd C:\xampp\htdocs\Vore_studio\vore_mobile_native
npm install
npm run start:lan
```

## 3) Verificação rápida antes de build
```powershell
npm run doctor
```

## 4) Build de teste Android (APK interno)
```powershell
npx eas build --platform android --profile preview
```

## 5) Build de teste iOS (interno)
```powershell
npx eas build --platform ios --profile preview
```

## 6) Check funcional mínimo
- Login profissional, comum e convidado
- Home/Feed com scroll sem travar
- Abrir perfil e modais (galeria/produto/serviço)
- Editar perfil e guardar
- Filtros avançados no Feed
- Partilhas e recomendações

## 7) Nota importante
- Se existir `src/screens/ExploreScreen_new.js`, pode ser removido quando não estiver bloqueado:
```powershell
del /f /q src\screens\ExploreScreen_new.js
```
