/* Gerador de dados aleatórios para a simulação do WhatsApp Web.
 * Expõe `window.WAData` com conversas (contatos, grupos e contas comerciais) e respostas. */
(function (global) {
  'use strict';

  const CONTACT_NAMES = [
    'Ana Clara', 'Bruno Costa', 'Camila Ferreira', 'Diego Rocha', 'Elisa Martins',
    'Fábio Lima', 'Gabriela Souza', 'Hugo Alves', 'Isabela Nunes', 'João Pedro',
    'Karen Oliveira', 'Lucas Pereira', 'Mariana Gomes', 'Nicolas Barbosa',
    'Olívia Ramos', 'Paulo Henrique', 'Quésia Moura', 'Rafael Dias', 'Sofia Teixeira',
    'Thiago Mendes', 'Úrsula Batista', 'Vitor Cardoso', 'Yasmin Freitas', 'Caio Pinheiro',
  ];

  const GROUP_NAMES = [
    'Turma do Futebol', 'Almoço de Domingo', 'Projeto Lançamento',
    'Turma da Faculdade', 'Viagem Floripa',
  ];

  // Contas comerciais fictícias, cada uma com a cor do avatar
  const BUSINESS_NAMES = [
    { name: 'Cartões Vértice', color: '#ea580c' },
    { name: 'Loja Aurora Esportes', color: '#1d4ed8' },
    { name: 'Clínica Sorriso Vital', color: '#0f766e' },
    { name: 'Seguros Horizonte', color: '#7c3aed' },
    { name: 'Academia Pulse', color: '#be123c' },
  ];

  // Cada tópico é uma pequena conversa que faz sentido quando lida em ordem.
  const TOPICS = [
    [
      'Oi, você conseguiu revisar a apresentação?',
      'Consegui sim! Ficou ótima. Só mudei o título do slide 3.',
      'Perfeito, vou mandar para o time amanhã cedo.',
      'Alguém já falou com o cliente sobre o prazo?',
      'Ainda não. Quer que eu ligue hoje à tarde?',
      'Seria ótimo, obrigado!',
      'Reunião de alinhamento às 10h, não esquece.',
      'Já coloquei na agenda 👍',
    ],
    [
      'Vai ter almoço no domingo na casa da vó?',
      'Vou sim! Quer que eu leve a sobremesa?',
      'Leva aquele bolo de cenoura que ela adora 😄',
      'Combinado então. Chego por volta de 12h.',
      'Não esquece de avisar a tia Cida.',
      'Já avisei, ela disse que vai fazer feijoada.',
    ],
    [
      'Bora jogar uma partida hoje à noite?',
      'Bora! Mas só depois das 21h.',
      'Fechado. Chama o pessoal também.',
      'kkkkk o último jogo foi um desastre',
      'A culpa foi do juiz, não minha 😂',
      'Quem leva as cervejas?',
      'Eu levo, pode deixar.',
    ],
    [
      'Já reservou o hotel para o fim de semana?',
      'Ainda não. Você prefere perto da praia?',
      'Prefiro sim. Achei uma opção boa no centro também.',
      'Manda o link que eu dou uma olhada.',
      'Enviado! O preço está bem razoável.',
      'Então vamos nessa, já comprei as passagens ✈️',
    ],
    [
      'Você já começou a lista de exercícios?',
      'Comecei ontem, mas travei na questão 4.',
      'Me manda a foto que eu te explico.',
      'Acho que a resposta é a letra C, mas não tenho certeza.',
      'Confere a fórmula de Bhaskara, deu certo aqui!',
      'Valeu demais! Amanhã a gente revisa juntos.',
    ],
  ];

  // Conversas de contas comerciais: remetente fixo, formatação e botão de ação na última mensagem
  const BUSINESS_TOPICS = [
    [
      { from: 'them', text: 'Olá! Seu pedido *#4821* foi confirmado. 🎉' },
      { from: 'me', text: 'Show! Qual é a previsão de entrega?' },
      { from: 'them', text: 'A previsão é para *quinta-feira*, entre 14h e 18h.', cta: 'Acompanhar pedido' },
    ],
    [
      { from: 'them', text: 'Olá! Sua fatura de _outubro_ já está disponível.' },
      { from: 'me', text: 'Dá pra pagar pelo app?' },
      { from: 'them', text: 'Dá sim! Basta abrir a área de faturas e escolher a forma de pagamento.', cta: 'Ver fatura' },
    ],
    [
      { from: 'them', text: 'Oi! Sua consulta está agendada para *amanhã às 9h*.' },
      { from: 'me', text: 'Perfeito, obrigado!' },
      { from: 'them', text: 'Se precisar remarcar, é só responder esta mensagem.', cta: 'Falar com o atendimento' },
    ],
  ];

  // Mensagens soltas que podem entrar no fim de uma conversa
  const FILLER = [
    'bom dia! 😊',
    'tudo bem por aí?',
    'depois me conta!',
    'boa noite, descansa!',
    'já almoçou?',
    'te mando mais tarde',
    'kkkkkk',
    'que dia corrido, né?',
    'pode deixar!',
    'estou no trânsito, falamos depois',
  ];

  // Respostas automáticas: a primeira regra que bater no texto é usada
  const REPLY_RULES = [
    {
      test: /\?$/,
      replies: ['Claro!', 'Sim, pode ser 👍', 'Acho que sim, deixa eu confirmar.', 'Ainda não sei, te falo depois.'],
    },
    {
      test: /^(oi|olá|ola|bom dia|boa tarde|boa noite)/i,
      replies: ['Oi! Tudo bem por aí?', 'Olá! Tudo certo 😊', 'Opa, bom dia!'],
    },
    {
      test: /obrigad|valeu/i,
      replies: ['De nada!', 'Imagina 🙌', 'Sempre que precisar!'],
    },
    {
      test: /k{3,}|haha|rsrs|😂/i,
      replies: ['kkkkkk', 'morri 😂', 'hahaha verdade'],
    },
  ];

  const GENERIC_REPLIES = [
    'Entendi 👍', 'Boa!', 'Combinado', 'Verdade, concordo', 'Me avisa quando puder',
    'Haha, sério?', 'Show! 🎉', 'Depois a gente conversa mais sobre isso', 'Certo, anotado',
  ];

  const BUSINESS_REPLIES = [
    'Certo! Vou verificar isso pra você.',
    'Obrigado pelo contato 😊',
    'Seu atendimento foi registrado.',
    'Qualquer dúvida, é só chamar!',
  ];

  const LOAD_NOTICE = 'Clique neste aviso para carregar mensagens mais antigas do seu celular.';
  const E2E_NOTICE = 'Esta empresa agora usa um serviço seguro para gerenciar esta conversa. Clique para saber mais.';

  let sequence = 0;
  const uid = (prefix = 'id') => `${prefix}${++sequence}`;

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (list) => list[randomInt(0, list.length - 1)];

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Cor do avatar estável por nome: o mesmo contato sempre tem a mesma cor
  function colorFor(name) {
    let hash = 0;
    for (const char of name) {
      hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }
    return `hsl(${hash % 360} 45% 42%)`;
  }

  // Rascunho de conversa pessoal ou de grupo: um tópico, com remetentes alternados
  function buildPersonalDrafts(members) {
    const topic = pick(TOPICS);
    const texts = topic.slice(0, randomInt(Math.min(3, topic.length), topic.length));
    if (Math.random() < 0.5) texts.push(pick(FILLER));

    let from = Math.random() < 0.5 ? 'me' : 'them';
    return texts.map((text) => {
      const draft = { from, text };
      if (from === 'them' && members) draft.author = pick(members);
      if (Math.random() < 0.7) from = from === 'me' ? 'them' : 'me';
      return draft;
    });
  }

  // Transforma rascunhos em mensagens com horário, e acrescenta os avisos do topo da conversa
  function createMessages(drafts, now, withE2E) {
    // Os horários voltam no tempo a partir da última mensagem (até 2 dias atrás)
    let time = now - randomInt(2, 48 * 60) * 60000;
    for (let i = drafts.length - 1; i >= 0; i--) {
      drafts[i].time = time;
      time -= randomInt(1, 180) * 60000;
    }

    const messages = drafts.map((draft) => ({
      id: uid('m'),
      from: draft.from,
      text: draft.text,
      time: draft.time,
      author: draft.author,
      cta: draft.cta ? { label: draft.cta } : undefined,
      status: draft.from === 'me' ? 'read' : undefined,
    }));

    const notices = [{ from: 'system', kind: 'load', text: LOAD_NOTICE }];
    if (withE2E) notices.push({ from: 'system', kind: 'e2e', text: E2E_NOTICE });

    const firstTime = messages[0].time;
    notices.forEach((notice, index) => {
      notice.id = uid('n');
      notice.time = firstTime - (notices.length - index) * 60000;
    });

    return [...notices, ...messages];
  }

  function buildChat(fields, messages) {
    const last = messages[messages.length - 1];
    return {
      id: uid('chat'),
      favorite: Math.random() < 0.2,
      muted: false,
      unread: last.from === 'them' && Math.random() < 0.6 ? randomInt(1, 4) : 0,
      typing: false,
      replyPending: false,
      messages,
      ...fields,
    };
  }

  function makeContact(name, now) {
    const messages = createMessages(buildPersonalDrafts(null), now, false);
    return buildChat(
      {
        type: 'contact',
        name,
        color: colorFor(name),
        online: Math.random() < 0.3,
        lastSeen: now - randomInt(5, 48 * 60) * 60000,
      },
      messages,
    );
  }

  function makeGroup(name, now) {
    const members = shuffle(CONTACT_NAMES).slice(0, randomInt(3, 5));
    const messages = createMessages(buildPersonalDrafts(members), now, false);
    return buildChat({ type: 'group', name, members, muted: Math.random() < 0.5 }, messages);
  }

  function makeBusiness(def, now) {
    const topic = pick(BUSINESS_TOPICS);
    const messages = createMessages(topic.map((draft) => ({ ...draft })), now, true);
    return buildChat({ type: 'business', name: def.name, color: def.color, verified: true }, messages);
  }

  function generateChats() {
    const now = Date.now();
    const contacts = shuffle(CONTACT_NAMES).slice(0, randomInt(7, 9)).map((name) => makeContact(name, now));
    const groups = shuffle(GROUP_NAMES).slice(0, randomInt(2, 3)).map((name) => makeGroup(name, now));
    const businesses = shuffle(BUSINESS_NAMES).slice(0, randomInt(2, 3)).map((def) => makeBusiness(def, now));
    return [...contacts, ...groups, ...businesses];
  }

  function generateReply(text, type) {
    if (type === 'business') return pick(BUSINESS_REPLIES);
    const rule = REPLY_RULES.find((item) => item.test.test(text));
    return pick(rule ? rule.replies : GENERIC_REPLIES);
  }

  global.WAData = { generateChats, generateReply, uid };
})(window);
