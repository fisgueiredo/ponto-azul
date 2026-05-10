# Ponto Azul — Especificação Técnica

## Contexto

App web (PWA) pessoal para o meu pai marcar e consultar lugares de estacionamento acessíveis para pessoas com mobilidade reduzida em Portugal. Utilizador único, sem autenticação, sem moderação, sem sistema de verificação. Estará online no Vercel mas é uma ferramenta de uso pessoal.

## Ponto de partida

A codebase frontend já existe na pasta atual, exportada do Claude Design. Os quatro ecrãs principais estão visualmente construídos:

1. Ecrã principal (mapa com pins, header de pesquisa, bottom sheet recolhido)
2. Bottom sheet expandido (lista de lugares marcados ordenados por distância)
3. Detalhe do lugar (com botões para Maps e Waze)
4. Adicionar lugar (formulário com título e descrição)

A estética está fechada e não deve ser alterada salvo necessidade técnica. O trabalho do Claude Code é ligar esta interface a dados reais, geolocalização e persistência.

## O que falta construir

| Camada | Estado |
|---|---|
| Layouts e componentes visuais | Já feito |
| Cores, tipografia, espaçamentos | Já feito |
| Base de dados (Supabase) | A criar |
| Persistência de lugares | A criar |
| Geolocalização do utilizador | A integrar |
| Mapa real (MapLibre GL) | A integrar (substituir mock) |
| Reverse geocoding (moradas) | A integrar |
| Deep links Maps e Waze | A integrar |
| Configuração PWA | A criar |
| Deploy no Vercel | A configurar |

## Stack a adicionar

| Camada | Tecnologia |
|---|---|
| Mapa | MapLibre GL JS com tiles do OpenStreetMap |
| Base de dados | Supabase (Postgres + extensão PostGIS) |
| Reverse geocoding | Nominatim (OpenStreetMap, gratuito) |
| PWA | manifest.json + service worker |
| Hosting | Vercel |

A stack do projeto exportado (presumivelmente Next.js, React, Tailwind, shadcn/ui) deve ser respeitada. Se for outra coisa, adaptar.

## Identidade visual (referência)

| Token | Hex | Uso |
|---|---|---|
| Azul principal | `#2774AE` | Pins, botões primários, header, estados ativos |
| Verde | `#00AF54` | Botões de confirmação, ações positivas |
| Off-white | `#FBF8EF` | Background da app e dos cards |

## Modelo de dados

Tabela `places` no Supabase:

```sql
create extension if not exists postgis;

create table places (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

create index places_location_idx on places using gist (location);
```

RPC para ordenar por distância em relação à posição do utilizador:

```sql
create or replace function places_near(user_lat float, user_lng float)
returns table (
  id uuid,
  title text,
  description text,
  lat float,
  lng float,
  distance_m float,
  created_at timestamptz
)
language sql stable as $$
  select
    p.id,
    p.title,
    p.description,
    st_y(p.location::geometry) as lat,
    st_x(p.location::geometry) as lng,
    st_distance(p.location, st_makepoint(user_lng, user_lat)::geography) as distance_m,
    p.created_at
  from places p
  order by p.location <-> st_makepoint(user_lng, user_lat)::geography;
$$;
```

RLS desativado (uso pessoal, sem auth). A `anon key` do Supabase tem acesso de leitura e escrita à tabela `places`.

## Funcionalidades por ecrã (lógica)

### Ecrã principal (mapa)

. Carregar todos os lugares do Supabase ao montar
. Renderizar pins azuis em todas as posições
. Header mostra contagem de lugares e cidade atual (via reverse geocoding da localização do utilizador)
. Pesquisa filtra a lista de lugares por título (case insensitive, sem acentos)
. Botão de centrar na localização: `navigator.geolocation.getCurrentPosition` e animar o mapa para essa posição
. Botão flutuante azul abre o ecrã de adicionar
. Bottom sheet recolhido mostra os 2 a 3 lugares mais próximos
. Tocar num pin ou num card abre o detalhe

### Bottom sheet expandido

. Lista completa de lugares retornados pela RPC `places_near`
. Header com "Lugares marcados", contagem e cidade
. Selector de ordenação (distância por defeito; alternativas: mais recentes, alfabética)
. Cada card mostra título, distância formatada (`180 m`, `1.2 km`) e morada (reverse geocoding)
. Tocar abre o detalhe

### Detalhe do lugar

. Mapa parcial com pin centrado na posição do lugar
. Botão de voltar (navega para o ecrã anterior)
. Botão de partilhar usa a Web Share API (`navigator.share`) com link da app + título do lugar
. Mostrar distância à posição atual do utilizador
. Mostrar título, morada (reverse geocoding) e descrição
. Botão "Maps":
  . iOS: `maps://?daddr=LAT,LNG`
  . Android e desktop: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`
  . Detetar via `navigator.userAgent` ou `navigator.platform`
. Botão "Waze": `https://waze.com/ul?ll=LAT,LNG&navigate=yes`

### Adicionar lugar

. Ao abrir, pedir geolocalização (`navigator.geolocation.getCurrentPosition`)
. Pin no mapa centrado nessa posição, arrastável para ajustar manualmente
. Campo "Título" obrigatório (max 80 chars)
. Campo "Descrição" opcional (max 400 chars)
. Botão "Confirmar" (verde `#00AF54`):
  . Insere na tabela `places` com `st_makepoint(lng, lat)::geography` para `location`
  . Em sucesso, regressa ao ecrã principal e centra o mapa no novo lugar
  . Em erro, mostra toast com a mensagem
. Botão de voltar cancela e regressa ao mapa

## PWA

. `manifest.json` na raiz pública:
  . `name`: "Ponto Azul"
  . `short_name`: "Ponto Azul"
  . `theme_color`: `#2774AE`
  . `background_color`: `#FBF8EF`
  . `display`: `standalone`
  . `start_url`: `/`
  . Ícones em todos os tamanhos standard (192, 512, maskable)
. Service worker mínimo (cache do app shell, dados sempre online)
. Apple touch icons e meta tags para iOS instalável
. `viewport-fit=cover` para usar a área toda do ecrã, incluindo notch

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Configurar no Vercel e em `.env.local` para desenvolvimento.

## Deploy

. Repositório GitHub
. Vercel ligado ao repositório, deploy automático em push para `main`
. Sem custom domain (URL `.vercel.app` chega)

## Sequência de trabalho recomendada

1. Auditoria da codebase existente (estrutura de pastas, componentes, dados mock)
2. Setup do Supabase (criar tabela, índice, RPC, configurar variáveis)
3. Substituir dados mock por queries reais no Supabase, ecrã a ecrã, mantendo a UI intacta
4. Integrar MapLibre GL no lugar do mapa visual (se for placeholder na codebase atual)
5. Integrar geolocalização (centrar mapa, calcular distâncias, reverse geocoding)
6. Implementar fluxo de adicionar lugar (formulário ligado ao Supabase)
7. Implementar deep links de Maps e Waze no detalhe
8. Configurar PWA (manifest, service worker, ícones)
9. Testar em iOS Safari (telemóvel real do utilizador final)
10. Deploy no Vercel

## Prompt inicial para o Claude Code

```
Estou a construir o Ponto Azul, uma PWA pessoal para o meu pai marcar lugares de estacionamento acessíveis para pessoas com mobilidade reduzida.

A pasta onde estamos contém o projeto exportado do Claude Design com os quatro ecrãs visuais já construídos. A estética está fechada e não deve ser alterada salvo necessidade técnica.

Anexo a especificação técnica completa em ponto-azul-spec.md.

Antes de escreveres uma linha de código, faz isto pela ordem:

1. Audita a codebase: lista a estrutura de pastas, identifica o framework, os componentes principais, onde estão os dados mock e como estão organizados os ecrãs. Dá-me um resumo curto.

2. Faz-me as perguntas que tiveres sobre o que está ambíguo ou onde a codebase atual não encaixa bem com o spec.

3. Propõe a abordagem de integração: como vais ligar Supabase, MapLibre, geolocalização e PWA sem partir o que já está feito visualmente.

Só depois disso vamos avançar passo a passo, ecrã a ecrã, pela sequência indicada no spec.

A primeira tarefa concreta será o setup do Supabase: criar a tabela, o índice e a RPC, configurar variáveis de ambiente. Antes de criares qualquer coisa no Supabase, mostra-me as queries SQL para eu confirmar.
```
