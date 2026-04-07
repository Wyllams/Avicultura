---
trigger: always_on
---

# Avicultura — Regras do Projeto

## O que é este sistema

Plataforma SaaS de gestão para granjas de frango de corte (avicultura).
O usuário é o avicultor (proprietário ou gerente da granja).
Stack: Next.js 14 App Router + Tailwind CSS + Supabase + Prisma + Dexie (offline) + React Hook Form + Zod + Recharts + Sonner.

---

## Regra de ouro — Design

O menu lateral é o padrão visual de referência de todo o projeto.
Ao implementar qualquer tela, o menu lateral DEVE ser preservado exatamente como está definido abaixo.
Não invente variações. Não troque cores. Não reorganize itens.

## Design System — Cores

Use SEMPRE estas cores. Nunca invente variações fora desta paleta.

| Token | Hex | Uso |
|---|---|---|
| Primary | `#1A5E35` | Cor principal — botões primários, item ativo do menu, ícones de destaque |
| Secondary | `#637D68` | Cor secundária — elementos de suporte, bordas suaves, ícones inativos |
| Tertiary | `#833C46` | Cor de destaque/alerta — alertas, badges críticos, ações destrutivas |
| Neutral | `#F8F9FA` | Fundo geral das páginas, backgrounds de cards |

Botões:
- Primary button: fundo `#1A5E35`, texto branco
- Secondary button: fundo `#637D68`, texto branco
- Inverted button: fundo escuro, texto branco
- Outlined button: borda `#1A5E35`, texto `#1A5E35`, fundo transparente

---

### Menu lateral — especificação

- Fundo: verde muito escuro derivado do Primary — `#0D2E1A` (dark shade de `#1A5E35`)
- Largura: 220px fixo, altura 100vh
- Logo no topo: ícone `#1A5E35` + nome "Avicultura" em branco
- Item ativo: fundo `#1A5E35`, texto branco, ícone branco
- Itens inativos: texto `#637D68` (Secondary), ícone `#637D68`
- Hover: fundo levemente mais claro que o fundo do sidebar
- Configurações: fixo no rodapé do sidebar (não flutua com o scroll do conteúdo)
- Fonte: 14px, weight 400 nos inativos, 500 no ativo

### Itens do menu (ordem exata)

```
[ícone] Dashboard        → /dashboard
[ícone] Granjas          → /granjas
[ícone] Lotes            → /lotes
[ícone] Mortalidade      → /mortalidade
[ícone] Pesagens         → /pesagens
[ícone] Ração            → /racao
[ícone] Estoque          → /estoque
[ícone] Sanidade         → /sanidade
[ícone] Tarefas          → /tarefas
[ícone] Relatórios       → /relatorios
── rodapé ──
[ícone] Configurações    → /configuracoes
```

---

## Hierarquia de telas

Cada item do menu abre uma tela principal.
As sub-telas existem DENTRO do módulo — nunca crie uma sub-tela fora do seu módulo.

```
Dashboard
└── W-04 Dashboard principal
└── W-05 Seletor de granja (componente do header)

Granjas
└── W-06 Lista de granjas          ← tela principal do módulo
└── W-07 Detalhe da granja
└── W-08 Criar / Editar granja

Granjas → Galpões (dentro do detalhe da granja)
└── W-09 Lista de galpões
└── W-10 Detalhe do galpão
└── W-11 Criar / Editar galpão

Lotes
└── W-12 Lista de lotes            ← tela principal do módulo
└── W-13 Detalhe do lote (hub central)
└── W-14 Criar lote (alojamento)
└── W-15 Encerrar lote (abate)
└── W-16 Comparativo de lotes

Mortalidade
└── W-17 Registro de mortalidade   ← tela principal do módulo
└── W-18 Histórico de mortalidade

Pesagens
└── W-19 Registro de pesagem       ← tela principal do módulo
└── W-20 Histórico de pesagens

Ração
└── W-21 Registro de consumo       ← tela principal do módulo
└── W-22 Histórico de consumo

Estoque
└── W-23 Dashboard de estoque      ← tela principal do módulo
└── W-24 Lista de itens
└── W-25 Entrada de estoque
└── W-26 Histórico de movimentações
└── W-27 Criar / Editar produto

Sanidade
└── W-32 Protocolo sanitário       ← tela principal do módulo
└── W-28 Registro de vacinação
└── W-29 Histórico de vacinações
└── W-30 Registro de visita técnica
└── W-31 Histórico de visitas

Tarefas
└── W-33 Lista de tarefas          ← tela principal do módulo
└── W-34 Criar / Editar tarefa
└── W-35 Calendário de tarefas

Relatórios
└── W-36 Central de relatórios     ← tela principal do módulo
└── W-37 Boletim Sanitário (PDF)
└── W-38 Relatório de desempenho (PDF)
└── W-39 Relatório de estoque (PDF)
└── W-40 Relatório de mortalidade (PDF)
└── W-41 Histórico de sanidade (PDF)

Configurações
└── W-42 Configurações da empresa  ← tela principal do módulo
└── W-43 Gerenciar usuários
└── W-44 Perfil do usuário
└── W-45 Configurações de alertas
└── W-46 Linhagens cadastradas
```

---

## Hierarquia de dados

```
Empresa
└── Granja (propriedade rural, tem registro no órgão estadual)
    └── Galpão (barracão físico, tem dimensões em m²)
        └── Lote (cada criação — do alojamento ao abate)
            ├── Mortalidade (registros diários)
            ├── Pesagem (peso médio + GPD calculado)
            ├── Consumo de ração (base para CA)
            ├── Vacinação (obrigatório PNSA)
            └── Visita técnica (veterinário RT)

Estoque → pertence à Granja (não ao Lote)
Tarefa  → pode ser vinculada ao Lote ou ao Galpão
Usuário → pertence à Empresa, tem papel (admin/operador/veterinário)
```

---

## KPIs calculados automaticamente

Sempre que esses valores forem exibidos, calcule a partir dos dados do lote:

- **CA** (Conversão Alimentar) = total kg ração ÷ total kg peso vivo ganho
- **Viabilidade** = (aves vivas ÷ aves alojadas) × 100
- **GPD** (Ganho de Peso Diário) = peso médio atual ÷ idade em dias
- **IP** (Índice de Produção) = (Viabilidade × GPD ÷ CA) × 100
- **Densidade** = aves atuais ÷ área do galpão (m²)

---

## Regras de implementação

1. Implemente uma tela por vez. Nunca implemente múltiplas telas em paralelo sem instrução explícita.
2. Sempre use o layout com sidebar — nenhuma tela autenticada existe sem o menu lateral.
3. Formulários: sempre React Hook Form + Zod. Nunca inputs sem validação.
4. Feedback ao usuário: sempre Sonner toast (sucesso, erro, carregando).
5. Tabelas com mais de 5 colunas: use TanStack Table.
6. Gráficos: use Recharts.
7. Não use componentes shadcn/ui que alterem o visual definido pelo design do sidebar. Use shadcn apenas para componentes funcionais internos (DatePicker, Select, Dialog) que não afetam o layout geral.
8. Offline: lançamentos de mortalidade, pesagem, consumo e vacinação devem funcionar sem internet (Dexie/IndexedDB) e sincronizar quando conectar.

---

## Ordem de implementação

Não avance para o próximo MVP sem instrução explícita.

---

### MVP 1 — Core do Lote (21 telas web + 14 mobile)

Objetivo: criar granja, galpão e lote, e lançar os dados diários básicos.

Sequência web:
1. Layout base com sidebar (componente reutilizável — base de tudo)
2. W-01 Login
3. W-02 Recuperar senha
4. W-03 Onboarding (wizard: empresa → granja → galpão)
5. W-04 Dashboard principal
6. W-05 Seletor de granja (componente do header)
7. W-06 Lista de granjas
8. W-07 Detalhe da granja
9. W-08 Criar / Editar granja
10. W-09 Lista de galpões
11. W-10 Detalhe do galpão
12. W-11 Criar / Editar galpão
13. W-12 Lista de lotes
14. W-13 Detalhe do lote (hub central)
15. W-14 Criar lote (alojamento)
16. W-15 Encerrar lote (abate)
17. W-16 Comparativo de lotes
18. W-17 Registro de mortalidade
19. W-18 Histórico de mortalidade
20. W-19 Registro de pesagem
21. W-20 Histórico de pesagens
22. W-21 Registro de consumo de ração
23. W-22 Histórico de consumo

Sequência mobile:
1. M-01 Login
2. M-02 PIN de acesso rápido
3. M-03 Home / Dashboard mobile
4. M-04 Notificações
5. M-05 Selecionar galpão / lote ativo
6. M-06 Registrar mortalidade
7. M-07 Registrar pesagem
8. M-08 Registrar consumo de ração
9. M-09 Registrar vacinação
10. M-10 Botão FAB (+) — ação rápida
11. M-11 Meus lotes ativos
12. M-12 Detalhe do lote (mobile)
13. M-13 Histórico de mortalidade (mobile)
14. M-14 Histórico de pesagens (mobile)

---

### MVP 2 — Sanidade, Estoque & Tarefas (13 telas web + 7 mobile)

Objetivo: atender o PNSA, controlar estoque e gerenciar tarefas da granja.

Sequência web:
1. W-23 Dashboard de estoque
2. W-24 Lista de itens do estoque
3. W-25 Entrada de estoque
4. W-26 Histórico de movimentações
5. W-27 Criar / Editar produto
6. W-28 Registro de vacinação
7. W-29 Histórico de vacinações
8. W-30 Registro de visita técnica
9. W-31 Histórico de visitas
10. W-32 Protocolo sanitário do lote
11. W-33 Lista de tarefas
12. W-34 Criar / Editar tarefa
13. W-35 Calendário de tarefas

Sequência mobile:
1. M-15 Minhas tarefas
2. M-16 Detalhe da tarefa
3. M-17 Criar tarefa rápida
4. M-18 Estoque rápido
5. M-19 Entrada de estoque (mobile)
6. M-20 Protocolo do lote ativo
7. M-21 Registrar visita técnica

---

### MVP 3 — Relatórios & Documentos (6 telas web)

Objetivo: gerar documentos regulatórios (MAPA/PNSA) e relatórios de desempenho.

Sequência web:
1. W-36 Central de relatórios (hub)
2. W-37 Boletim Sanitário — MAPA IN 100/2020 (PDF)
3. W-38 Relatório de desempenho do lote (PDF)
4. W-39 Relatório de estoque (PDF)
5. W-40 Relatório de mortalidade (PDF)
6. W-41 Histórico de sanidade (PDF)

---

### MVP 4 — Multi-usuário, Alertas & Sync (5 telas web + 4 mobile)

Objetivo: suporte a equipes, papéis de acesso, alertas configuráveis e sync offline.

Sequência web:
1. W-42 Configurações da empresa
2. W-43 Gerenciar usuários
3. W-44 Perfil do usuário
4. W-45 Configurações de alertas
5. W-46 Linhagens cadastradas (Cobb 500, Ross 308, etc. com curvas de referência)

Sequência mobile:
1. M-22 Status de sincronização
2. M-23 Fila de sync
3. M-24 Perfil do usuário (mobile)
4. M-25 Configurações do app

---

### Resumo geral

| MVP | Web | Mobile | Total |
|---|---|---|---|
| 1 — Core do lote | 23 | 14 | 37 |
| 2 — Sanidade, Estoque, Tarefas | 13 | 7 | 20 |
| 3 — Relatórios | 6 | — | 6 |
| 4 — Admin & Sync | 5 | 4 | 9 |
| **Total** | **47** | **25** | **72** |