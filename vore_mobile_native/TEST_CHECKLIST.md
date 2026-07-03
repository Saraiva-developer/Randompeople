# Vore Mobile Native - Test Checklist

## 1) Arranque limpo
- `cd C:\xampp\htdocs\Vore_studio\vore_mobile_native`
- `npm install`
- `npm start -- --clear`

## 2) Login/Registo
- Entrar com conta profissional.
- Entrar com conta comum.
- Entrar como convidado.

## 3) Home/Feed performance
- Scroll continuo no Home sem bloqueios.
- Scroll continuo no Feed sem bloqueios.
- Abrir 4-5 perfis seguidos e voltar.

## 4) Perfil e modais
- Abrir modal de produto e fechar.
- Abrir modal de servico e fechar.
- Abrir modal de galeria e fechar.
- Abrir stories e fechar.
- Confirmar que nao ha flicker nem crash.

## 5) Filtros
- Abrir filtros avancados.
- Pesquisar categoria.
- Aplicar e limpar filtros.
- Confirmar lista atualiza sem erro.

## 6) Cross-device
- iOS: validar teclado e modais.
- Android: validar scroll e cabecalhos fixos.

## 7) Erros no terminal
- Sem erro de hooks.
- Sem erro de render depth.
- Sem erro de recurso em falta.

