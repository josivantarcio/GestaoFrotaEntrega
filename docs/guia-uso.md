# Guia de Uso

## Primeiro Acesso

Ao abrir o app pela primeira vez, o banco de dados é criado automaticamente. Nenhuma configuração é necessária.

**Fluxo recomendado de configuração inicial:**

1. **Cadastros → Cidades** — Cadastre as cidades de entrega
2. **Cadastros → Entregadores** — Cadastre os entregadores e associe às cidades
3. **Cadastros → Veículos** — Cadastre os veículos da frota
4. *(Opcional)* **Cadastros → Rotas Modelo** — Crie templates para rotas frequentes

---

## Criando uma Rota

1. Toque em **Rota** na barra inferior
2. Selecione o **veículo** — o motorista padrão é preenchido automaticamente
3. Informe o **KM de saída**
4. Adicione as **paradas**: cidade, entregador e volumes
5. Toque em **Iniciar e Avisar no WhatsApp** ou **Iniciar sem avisar**

> O formulário é salvo automaticamente como rascunho. Se você fechar o app, as informações são restauradas ao reabrir.

### Usando Rotas Modelo

Se há modelos cadastrados, um botão **"Usar rota modelo"** aparece no topo do formulário. Ao selecionar um modelo, veículo e paradas são preenchidos automaticamente — só falta informar os volumes.

---

## Gerenciando a Rota em Andamento

Ao iniciar uma rota, o app vai para a tela de gestão em tempo real.

### Registrar Ocorrência

1. Toque na parada desejada para expandir
2. Toque em **+ Ocorrência**
3. Selecione o tipo, informe a quantidade e uma descrição opcional

### Concluir Parada

1. Expanda a parada
2. Informe os **volumes entregues** e **devolvidos**
3. Ajuste a **hora** se necessário
4. Toque em **Concluir parada**

O app pergunta se deseja avisar via WhatsApp.

### Encerrar Rota

Quando todas as paradas estiverem concluídas, o botão **Encerrar Rota** fica disponível.

1. Informe o **KM de chegada** (obrigatório)
2. Ajuste a **hora de chegada** se necessário
3. Toque em **Encerrar**

O app pergunta se deseja enviar o resumo via WhatsApp e informa se há alerta de manutenção pendente para o veículo.

---

## Histórico

A tela **Histórico** exibe todas as rotas com filtros:

- **Período**: data início e fim (padrão: último mês)
- **Status**: Todos / Em andamento / Concluídas
- **Atalhos**: 7 dias, 30 dias, 3 meses

O card de totais mostra KM rodados, volumes, tempo em rota e ocorrências do período filtrado.

Toque em uma rota para ver o detalhe completo com todas as paradas, volumes e ocorrências.

---

## Manutenção

### Registrar Abastecimento

1. Vá em **Frota** e toque no veículo
2. Toque em **Abastecimentos** → **+** no canto superior
3. Informe data, KM atual, litros, valor e tipo de combustível
4. O consumo (km/L) e custo (R$/km) são calculados automaticamente

> O KM informado deve ser maior que o do último abastecimento.

### Registrar Manutenção

1. Vá em **Frota** e toque no veículo
2. Toque em **Manutenções** → **+** no canto superior
3. Informe data, KM, tipo de óleo e marque os itens substituídos
4. Informe opcionalmente o KM ou data da próxima troca

Veículos com manutenção vencida aparecem com borda vermelha e badge **VENCIDA** na tela de frota.

---

## Relatórios

1. Acesse **Relatórios** pelo Dashboard (card de acesso rápido)
2. Filtre por **veículo** e **período**
3. Alterne entre as abas **Abastecimentos** e **Manutenções**
4. Use o botão **WhatsApp** para compartilhar o resumo ou registros individuais

---

## Avisos WhatsApp

O app usa o WhatsApp instalado no próprio dispositivo. Ao tocar em qualquer botão de compartilhamento:

- Se o WhatsApp está instalado → abre diretamente
- Se não está → abre o link `wa.me` no navegador

O texto da mensagem é formatado automaticamente com todos os detalhes da operação.
