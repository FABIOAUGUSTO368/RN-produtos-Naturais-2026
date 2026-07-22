# RN Naturais Premium

Loja virtual de produtos naturais com frontend em React + Vite e backend em Express.

## Visao geral

- Vitrine de produtos com filtro por categoria
- Interface responsiva para desktop e mobile
- Tema visual com destaque para produtos naturais
- Servidor Node para servir o app em producao

## Requisitos

- Node.js 20 ou superior
- pnpm 10

## Instalacao

```bash
pnpm install
```

## Desenvolvimento

```bash
pnpm dev
```

## Verificacoes

```bash
pnpm check
pnpm build
```

## Producao

O build gera o frontend em `dist/public` e o servidor em `dist/index.js`.

```bash
pnpm build
pnpm start
```

### Docker

Para subir em uma VPS com Docker:

```bash
cp .env.example .env
docker compose up -d --build
```

O banco SQLite fica persistido no volume `./data` da VPS.

## Estrutura principal

- `client/` interface web
- `server/` servidor Express
- `shared/` constantes compartilhadas
- `drizzle/` esquema e migracoes do banco
- `patches/` ajustes de dependencias

## Variaveis de ambiente

- `PORT`: porta do servidor
- `VITE_OAUTH_PORTAL_URL`: URL do portal de autenticacao
- `VITE_APP_ID`: identificador do app
- `BUILT_IN_FORGE_API_URL`: endpoint de armazenamento em desenvolvimento
- `BUILT_IN_FORGE_API_KEY`: chave para o proxy de storage

