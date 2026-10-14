# WhatsApp Web · Prova de conceito

Simulação da interface do WhatsApp Web em HTML, CSS e JavaScript puros, sem dependências nem build. O visual segue a referência de WhatsApp Web (versão desktop).

## Como executar

Abra o arquivo `index.html` no navegador (duplo clique).

Se preferir servir por HTTP local:

```bash
cd whatsapp-web-poc
python3 -m http.server 8080
```

Depois acesse http://localhost:8080.

## Jornada roteirizada: conversa "Banco"

A conversa **Banco** é fixa: fica no topo da lista e não some ao gerar novas conversas.

1. Digite **Olá**: o Banco responde com a mensagem de boas-vindas e um botão **Opções**.
2. Clique em **Opções**: abre a lista de seleção com **Saldo**, **Extrato** e **Boletos**.
3. Escolha uma opção: a escolha aparece citando a mensagem anterior, e o Banco responde com a informação e oferece o menu de novo.

Também é possível digitar livremente: "saldo", "extrato" e "boletos" levam à resposta correspondente, "opções" mostra o menu, e qualquer outro texto recebe uma orientação para usar o menu. Os valores e datas são simulados.

O roteiro fica em [journey.js](whatsapp-web-poc/journey.js): textos, opções e respostas.

## Funcionalidades

**Lista de conversas**
- Conversas geradas aleatoriamente a cada carregamento (ou pelo botão de atualizar): contatos, grupos e contas comerciais
- Ordenadas pela mensagem mais recente, com horário, prévia e contador de não lidas
- Filtros: Tudo, Não lidas (com contagem), Favoritas e Grupos (com contagem)
- Busca pelo nome, sem diferenciar acentos
- Aviso de notificações desativadas, que pode ser fechado
- Conversas silenciadas mostram o ícone de mudo

**Conversa**
- Mensagens com horário, separadores de dia (Hoje, Ontem, dia da semana ou data) e rabinho nas bolhas
- Ticks de entrega: ✓ enviada, ✓✓ entregue, ✓✓ azul lida
- Respostas automáticas com indicador "digitando…"
- Em grupos: nome do autor colorido em cada mensagem e cabeçalho com os participantes
- Contas comerciais: selo de verificado, aviso de criptografia e botão de ação na última mensagem
- Formatação: `*negrito*`, `_itálico_` e `~tachado~`
- Envio com **Enter** (Shift+Enter quebra a linha); o microfone vira botão de enviar quando há texto

**Navegação e layout**
- Teclado: ↓ e ↑ entre as conversas, **Esc** fecha a conversa
- Barra lateral esquerda com contador de não lidas
- Layout responsivo: em telas pequenas, lista e conversa alternam, com botão de voltar
- Tema claro ou escuro, conforme a preferência do sistema

Os ícones da barra lateral, do cabeçalho da conversa e do campo de envio são apenas visuais, como na referência.

## Estrutura

| Arquivo      | Responsabilidade                                                  |
| ------------ | ----------------------------------------------------------------- |
| `index.html` | Marcação da página                                                |
| `styles.css` | Estilos e variáveis de cor (claro e escuro)                       |
| `data.js`    | Gerador de conversas, históricos, avisos e respostas aleatórias   |
| `journey.js` | Jornada roteirizada do Banco: textos, opções e respostas          |
| `app.js`     | Lógica da interface: filtros, lista, conversa, envio e status     |

Para mudar o universo de dados (nomes, assuntos, contas comerciais, respostas), edite as listas no topo de `data.js`.

## Limitações

Esta é uma prova de conceito, então:

- Nada é salvo: ao recarregar a página, novas conversas são geradas.
- As respostas são aleatórias e não têm relação real com o que foi enviado.
- Não há conexão real, anexos, áudio, chamadas, seletor de emojis nem busca dentro da conversa.
- Os nomes das contas comerciais são fictícios.
