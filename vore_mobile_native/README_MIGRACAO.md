## Vore Mobile Native (Expo)

Projeto inicial React Native para migracao da app.

### 1) Instalar e arrancar

```bash
cd vore_mobile_native
npm start
```

### 2) API base (importante)

Define a API no ambiente para o telemovel:

```bash
set EXPO_PUBLIC_API_BASE=http://SEU_IP_LOCAL/Vore_studio/api
npm start
```

Exemplo:

```bash
set EXPO_PUBLIC_API_BASE=http://192.168.1.50/Vore_studio/api
npm start
```

Se nao definires, o default no codigo e:

`http://localhost/Vore_studio/api`

### 3) Estado atual

- Home com cards
- Explore com grelha
- Profile (visitante/dono basico)
- Edit Profile basico (frontend state)

Proximo passo: ligar login e persistencia real por API em todos os ecras.
