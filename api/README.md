# Vore API (XAMPP/PHP)

## 1) Configuracao
- Edita `api/config.php` com as credenciais da tua BD MySQL.
- Importa `api/schema.sql` na BD (`vore_app` por exemplo).

## 2) Endpoints

### Auth
- `POST /vore/api/auth/register.php`
- `POST /vore/api/auth/login.php`
- `POST /vore/api/auth/logout.php`
- `GET /vore/api/auth/me.php`
- `POST /vore/api/auth/forgot-password.php`
- `POST /vore/api/auth/reset-password.php`

### Profiles
- `POST /vore/api/profiles/create.php`
- `GET /vore/api/profiles/me.php`
- `PUT /vore/api/profiles/me.php`
- `GET /vore/api/profiles/public.php?slug={slug}`

### Saved Profiles (Guardados)
- `GET /vore/api/saved/me.php`
- `PUT /vore/api/saved/me.php`

## 3) Payloads

### Register
```json
{
  "name": "Adriano",
  "email": "adriano@email.com",
  "password": "123456",
  "account_type": "professional"
}
```

`account_type` pode ser `professional` ou `common` (opcional; por defeito `professional`).

### Login
```json
{
  "email": "adriano@email.com",
  "password": "123456"
}
```

### Forgot password
```json
{
  "email": "adriano@email.com"
}
```

### Reset password
```json
{
  "token": "TOKEN_DEV_RECEBIDO_NO_FORGOT",
  "password": "nova123456"
}
```

### Criar perfil
```json
{
  "slug": "meu-estudio",
  "name": "Meu Estudio",
  "type": "service_pro",
  "data": {
    "name": "Meu Estudio",
    "role": "Massagem",
    "location": "Lisboa"
  },
  "is_published": true
}
```

### Atualizar perfil (PUT)
```json
{
  "name": "Meu Estudio Atualizado",
  "type": "service_pro",
  "data": {
    "name": "Meu Estudio Atualizado",
    "role": "Massagem e Recovery",
    "location": "Lisboa"
  },
  "is_published": true
}
```

### Guardar/remover perfil (PUT)
```json
{
  "profile_id": "101",
  "saved": true
}
```

## 4) Notas
- A autenticacao usa `PHP session` (cookie HTTP only).
- Em `fetch`, usa `credentials: "include"` para enviar sessao.
- O endpoint `me.php` devolve o perfil mais recentemente atualizado do utilizador autenticado.
- Em dev, `forgot-password.php` devolve `reset_token` no JSON para testes locais.
- Para os guardados, o backend usa a tabela `saved_profiles` (ver `schema.sql`).
