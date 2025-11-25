# Dashboard Components

Esta pasta contém todos os componentes relacionados ao Dashboard de KPIs do WPP Monitor.

## 📁 Estrutura

```
dashboard/
├── DashboardView.tsx     # Componente principal do dashboard
├── KPICard.tsx          # Card individual de KPI
├── VendorRanking.tsx    # Ranking de vendedores
├── ActivityChart.tsx    # Gráfico de atividade por hora
├── AlertsPanel.tsx      # Painel de alertas
├── index.ts             # Barrel export
└── README.md            # Esta documentação
```

## 🎯 Componentes

### DashboardView

Componente principal que exibe todos os KPIs e métricas do sistema.

**Funcionalidades:**

- Filtro por período (Hoje/Semana/Mês)
- Filtro por conta (quando selecionada)
- Atualização automática a cada 30 segundos
- Exibição de:
  - Mensagens enviadas/recebidas
  - Conversas ativas
  - Novos contatos
  - Tempo médio de resposta
  - Taxa de resposta
  - Pico de atividade
  - Ranking de vendedores
  - Gráfico de atividade horária
  - Estatísticas de mídia
  - Alertas

### KPICard

Card reutilizável para exibir um KPI individual.

**Props:**

- `icon`: Ícone do KPI
- `label`: Texto descritivo
- `value`: Valor do KPI (número ou string)
- `color`: Cor do tema ('blue' | 'green' | 'purple' | 'orange' | 'indigo' | 'teal' | 'pink')

### VendorRanking

Ranking interativo dos vendedores por diferentes métricas.

**Funcionalidades:**

- Ordenação por mensagens, conversas ou tempo de resposta
- Medalhas para top 3
- Sistema de estrelas
- Estatísticas resumidas

### ActivityChart

Gráfico de barras horizontais mostrando atividade por hora.

**Funcionalidades:**

- Barras duplas (enviadas/recebidas)
- Legendas coloridas
- Totalizador por hora
- Resumo geral

### AlertsPanel

Painel de alertas e notificações importantes.

**Tipos de alertas:**

- `no_response`: Mensagens não respondidas há 2h+
- `disconnected`: Contas desconectadas
- `cold_conversation`: Conversas sem interação há 3+ dias

## 🔌 Integração

### Backend (database.js)

Funções SQL adicionadas em `dashboardKPIs`:

- `getMessagesByPeriod()` - Mensagens por período
- `getActiveConversations()` - Conversas ativas
- `getNewContacts()` - Novos contatos
- `getAvgResponseTime()` - Tempo médio de resposta
- `getResponseRate()` - Taxa de resposta
- `getPeakHour()` - Horário de pico
- `getHourlyActivity()` - Atividade por hora
- `getVendorsRanking()` - Ranking de vendedores
- `getMediaStats()` - Estatísticas de mídia
- `getAlerts()` - Alertas do sistema

### API (server.js)

Endpoint criado:

```
GET /api/dashboard-kpis?accountId=<id>&period=<today|week|month>
```

Retorna:

```json
{
  "today": {
    "messagesSent": 127,
    "messagesReceived": 89,
    "activeConversations": 23,
    "newContacts": 8
  },
  "performance": {
    "avgResponseTime": 12.5,
    "responseRate": 94.3,
    "peakHour": 14
  },
  "vendors": [...],
  "hourlyActivity": [...],
  "alerts": [...],
  "mediaStats": {
    "images": 45,
    "videos": 12,
    "documents": 8,
    "audios": 23
  }
}
```

### Frontend (App.tsx)

- Botão "Dashboard" adicionado no Header
- Toggle entre view de chat e dashboard
- Estado gerenciado em `showDashboard`

## 🎨 Estilização

Todos os componentes usam:

- **TailwindCSS** para estilização
- **Lucide React** para ícones
- Paleta de cores consistente
- Design responsivo
- Animações suaves

## 🚀 Como Usar

1. Clique no ícone de Dashboard no Header (📊)
2. Selecione o período desejado (Hoje/Semana/Mês)
3. Opcionalmente, selecione uma conta específica na sidebar
4. Os dados atualizam automaticamente

## 🔄 Replicação para Windows

Para replicar na versão Windows:

1. Copie toda a pasta `dashboard/` para o projeto Windows
2. Certifique-se de que os imports estão corretos
3. Verifique se `database.js` tem as mesmas funções `dashboardKPIs`
4. Confirme que o endpoint `/api/dashboard-kpis` existe no `server.js`
5. Atualize `App.tsx` e `Header.tsx` da mesma forma

## 📊 KPIs Implementados

### Produtividade

- ✅ Total de conversas ativas
- ✅ Mensagens enviadas/recebidas
- ✅ Novos contatos
- ✅ Tempo médio de primeira resposta
- ✅ Taxa de resposta

### Volume de Atividade

- ✅ Mensagens por hora
- ✅ Pico de atendimento
- ✅ Distribuição temporal

### Engajamento

- ✅ Contatos ativos
- ✅ Conversas abertas vs fechadas

### Mídia

- ✅ Imagens compartilhadas
- ✅ Vídeos compartilhados
- ✅ Documentos compartilhados
- ✅ Áudios compartilhados

### Comparativo

- ✅ Ranking de vendedores
- ✅ Performance individual

### Alertas

- ✅ Contas offline
- ✅ Mensagens não respondidas
- ✅ Conversas frias

## 🐛 Debug

Para debugar problemas:

1. Verifique console do navegador (F12)
2. Confirme que o endpoint está respondendo:
   ```bash
   curl "http://localhost:3000/api/dashboard-kpis?period=today"
   ```
3. Verifique logs do servidor no terminal
4. Confirme que há dados no banco de dados SQLite

## 📝 Notas

- Os KPIs são calculados em tempo real via SQL
- Filtros por conta e período são aplicados no backend
- Componentes são modulares e reutilizáveis
- Performance otimizada para grandes volumes de dados
