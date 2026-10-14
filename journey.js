/* Jornada roteirizada da conversa "Banco".
 * Define a conversa fixa, o menu de opções, a conversa com o gerente e as respostas automáticas.
 * Expõe `window.WAJourney`. */
(function (global) {
  'use strict';

  const WELCOME_TEXT =
    'Que bom falar com você!\n\n' +
    'Por aqui você pode fazer consultas, transações e tirar dúvidas. ' +
    'Pra começar, você pode clicar em "Opções" ou escrever em poucas palavras o que precisa.';

  const E2E_NOTICE = 'Esta empresa agora usa um serviço seguro para gerenciar esta conversa. Clique para saber mais.';

  // Botão que abre a lista de opções
  const OPTIONS_CTA = { label: 'Opções', action: 'options' };

  // Gerente de relacionamento: o botão leva à conversa com ele (criada em createManagerChat)
  const MANAGER_NAME = 'Flavio Gerente';
  const MANAGER_CTA = { label: `Conversar com ${MANAGER_NAME}`, action: 'manager' };

  // Opções do menu, na ordem em que aparecem. `keywords` reconhece o que for digitado livremente.
  const OPTIONS = [
    { id: 'saldo', title: 'Saldo', description: 'Consulte o saldo disponível na sua conta', keywords: /saldo/ },
    { id: 'extrato', title: 'Extrato', description: 'Veja suas últimas movimentações', keywords: /extrato|movimentac/ },
    { id: 'boletos', title: 'Boletos', description: 'Consulte os boletos em aberto', keywords: /boleto/ },
    { id: 'gerente', title: 'Falar com meu gerente', description: 'Converse com o seu gerente de relacionamento', keywords: /gerente|atendente|humano/ },
  ];

  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Minúsculas e sem acentos, para comparar o que foi digitado
  const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // Data curta de hoje somada a um deslocamento em dias (dados simulados)
  function shortDate(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  const currentTime = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Toda resposta de consulta termina oferecendo o menu de novo
  const FOLLOW_UP = { text: 'Posso ajudar com mais alguma coisa?', cta: OPTIONS_CTA, delay: 1000 };

  // Respostas roteirizadas de cada opção (valores simulados)
  const ANSWERS = {
    saldo: () => [
      { text: `Seu saldo disponível é *${BRL.format(3482.15)}*.\n\nAtualizado às ${currentTime()}.`, delay: 1100 },
      FOLLOW_UP,
    ],
    extrato: () => [
      {
        text: [
          '*Últimas movimentações*',
          `${shortDate(-1)} · Mercado Central · - ${BRL.format(214.9)}`,
          `${shortDate(-2)} · Salário · + ${BRL.format(5200)}`,
          `${shortDate(-4)} · Farmácia · - ${BRL.format(47.3)}`,
        ].join('\n'),
        delay: 1300,
      },
      FOLLOW_UP,
    ],
    boletos: () => [
      {
        text: [
          'Você tem *2 boletos em aberto*:',
          `Energia elétrica · vence em ${shortDate(5)} · ${BRL.format(189.4)}`,
          `Cartão de crédito · vence em ${shortDate(9)} · ${BRL.format(1250)}`,
        ].join('\n'),
        delay: 1300,
      },
      FOLLOW_UP,
    ],
    gerente: () => [
      {
        text: `Claro! Seu gerente de relacionamento é o ${MANAGER_NAME}. Clique no botão abaixo para continuar a conversa com ele.`,
        cta: MANAGER_CTA,
        delay: 1000,
      },
    ],
  };

  const GREETING =/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/;
  const MENU = /opc|menu|ajuda/;

  function answerOption(id) {
    return ANSWERS[id]();
  }

  // Decide a resposta para um texto digitado livremente
  function respond(text) {
    const normalized = normalize(text);

    const option = OPTIONS.find((item) => item.keywords.test(normalized));
    if (option) return answerOption(option.id);

    if (GREETING.test(normalized)) {
      return [{ text: WELCOME_TEXT, cta: OPTIONS_CTA, delay: 1200 }];
    }

    if (MENU.test(normalized)) {
      return [{ text: 'Escolha uma das opções abaixo.', cta: OPTIONS_CTA, delay: 900 }];
    }

    return [
      {
        text: 'Desculpe, não entendi. Você pode clicar em "Opções" ou escrever *saldo*, *extrato*, *boletos* ou *gerente*.',
        cta: OPTIONS_CTA,
        delay: 1000,
      },
    ];
  }

  // Conversa fixa, criada vazia (só com o aviso de criptografia), como uma conversa nova
  function createChat() {
    const createdAt = Date.now();
    return {
      id: WAData.uid('chat'),
      type: 'business',
      flow: true,
      name: 'Banco',
      color: '#1d4ed8',
      verified: true,
      favorite: false,
      muted: false,
      unread: 0,
      typing: false,
      replyPending: false,
      busy: false,
      queue: [],
      createdAt,
      messages: [{ id: WAData.uid('n'), from: 'system', kind: 'e2e', text: E2E_NOTICE, time: createdAt }],
    };
  }

  // Conversa com o gerente: já começa com uma mensagem dele e fica sempre na lista
  function createManagerChat() {
    const createdAt = Date.now();
    return {
      id: WAData.uid('chat'),
      type: 'contact',
      name: MANAGER_NAME,
      color: '#0f766e',
      online: true,
      lastSeen: createdAt,
      favorite: true,
      muted: false,
      unread: 1,
      typing: false,
      replyPending: false,
      createdAt,
      messages: [
        {
          id: WAData.uid('m'),
          from: 'them',
          text: 'Oi! Aqui é o Flavio, seu gerente de relacionamento. Pode me chamar por aqui sempre que precisar.',
          time: createdAt - 60000,
        },
      ],
    };
  }

  global.WAJourney = { createChat, createManagerChat, respond, answerOption, options: OPTIONS };
})(window);
