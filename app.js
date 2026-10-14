/* Interface da prova de conceito do WhatsApp Web.
 * Toda a tela é desenhada a partir do `state`; os dados vêm de data.js (WAData) e journey.js (WAJourney). */
(function () {
  'use strict';

  const els = {
    app: document.getElementById('app'),
    railBadge: document.getElementById('rail-badge'),
    list: document.getElementById('chat-list'),
    search: document.getElementById('search-input'),
    filters: document.getElementById('filters'),
    banner: document.getElementById('banner'),
    bannerClose: document.getElementById('banner-close'),
    regenerate: document.getElementById('regenerate-btn'),
    emptyState: document.getElementById('empty-state'),
    chatView: document.getElementById('chat-view'),
    backBtn: document.getElementById('back-btn'),
    avatarSlot: document.getElementById('chat-avatar'),
    name: document.getElementById('chat-name'),
    verified: document.getElementById('chat-verified'),
    status: document.getElementById('chat-status'),
    messages: document.getElementById('messages'),
    composer: document.getElementById('composer'),
    input: document.getElementById('message-input'),
    optionsModal: document.getElementById('options-modal'),
    optionList: document.getElementById('option-list'),
    optionsClose: document.getElementById('options-close'),
  };

  const state = {
    chats: [],
    bank: null,
    activeId: null,
    query: '',
    filter: 'all',
    optionsFrom: null,
    timers: [],
  };

  const FILTERS = [
    { id: 'all', label: 'Tudo', test: () => true },
    { id: 'unread', label: 'Não lidas', counted: true, test: (chat) => chat.unread > 0 },
    { id: 'favorites', label: 'Favoritas', test: (chat) => chat.favorite },
    { id: 'groups', label: 'Grupos', counted: true, test: (chat) => chat.type === 'group' },
  ];

  const TICK_TITLES = { sent: 'Enviada', delivered: 'Entregue', read: 'Lida' };
  const AUTHOR_COLORS = ['#06a383', '#e0528a', '#2a94c9', '#c9731a', '#7c5ce0', '#c0392b'];
  const MOBILE_QUERY = window.matchMedia('(max-width: 768px)');

  const ICON_MUTE =
    '<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.9 17.9 0 0 1 18 8"/>' +
    '<path d="M6.26 6.26A5.9 5.9 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><path d="M1 1l22 22"/>';
  const ICON_LINK =
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>';
  const ICON_LIST =
    '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>';
  const ICON_GROUP =
    '<circle cx="9" cy="8" r="3.2"/><path d="M3.2 19.5c.5-3.3 2.9-5.2 5.8-5.2s5.3 1.9 5.8 5.2z"/>' +
    '<circle cx="16.5" cy="9" r="2.6"/><path d="M16.2 14.4c2.4.2 4.3 1.9 4.8 5.1h-4.1z"/>';

  // Formatação do WhatsApp: *negrito*, _itálico_ e ~tachado~ (só quando colados a palavras)
  const FORMAT_PATTERN = /(?<!\w)\*([^*\n]+)\*(?!\w)|(?<!\w)_([^_\n]+)_(?!\w)|(?<!\w)~([^~\n]+)~(?!\w)/g;

  /* ---------- Utilitários ---------- */

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function svgIcon(markup, className = '') {
    const node = el('span', `icon ${className}`.trim());
    node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${markup}</svg>`;
    return node;
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  function startOfDay(ts) {
    const date = new Date(ts);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  const daysAgo = (ts) => Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 86400000);

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // "Hoje", "Ontem", dia da semana ou data: usado nos separadores e no "visto por último"
  function relativeDay(ts) {
    const diff = daysAgo(ts);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    if (diff < 7) return capitalize(new Date(ts).toLocaleDateString('pt-BR', { weekday: 'long' }));
    return new Date(ts).toLocaleDateString('pt-BR');
  }

  // Horário ou data curta mostrada na lista de conversas
  function listTime(ts) {
    const diff = daysAgo(ts);
    if (diff === 0) return formatTime(ts);
    if (diff === 1) return 'Ontem';
    if (diff < 7) return capitalize(new Date(ts).toLocaleDateString('pt-BR', { weekday: 'short' }));
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  const initials = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  // Cor estável por autor dentro de um grupo
  function authorColor(name) {
    let hash = 0;
    for (const char of name) {
      hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }
    return AUTHOR_COLORS[hash % AUTHOR_COLORS.length];
  }

  // A prévia na lista mostra o texto sem as marcas de formatação
  const stripFormatting = (text) => text.replace(/(?<!\w)([*_~])([^*_~\n]+)\1(?!\w)/g, '$2');

  // Escreve o texto da mensagem aplicando a formatação do WhatsApp
  function formatText(text, parent) {
    let cursor = 0;
    for (const match of text.matchAll(FORMAT_PATTERN)) {
      if (match.index > cursor) parent.append(text.slice(cursor, match.index));
      const [, bold, italic, strike] = match;
      if (bold !== undefined) parent.append(el('strong', '', bold));
      else if (italic !== undefined) parent.append(el('em', '', italic));
      else parent.append(el('s', '', strike));
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) parent.append(text.slice(cursor));
  }

  function createAvatar(chat, extraClass = '') {
    const avatar = el('div', `avatar ${extraClass}`.trim());
    if (chat.type === 'group') {
      avatar.classList.add('avatar--group');
      avatar.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_GROUP}</svg>`;
    } else {
      avatar.textContent = initials(chat.name);
      avatar.style.background = chat.color;
    }
    avatar.setAttribute('aria-hidden', 'true');
    return avatar;
  }

  function createTicks(status) {
    const ticks = el('span', `ticks ticks--${status}`);
    ticks.title = TICK_TITLES[status];
    const check = '<path d="M1 5.5l3.5 3.5L10 2.5"/>';
    const paths = status === 'sent' ? check : `${check}<path d="M5 5.5l3.5 3.5L15 2"/>`;
    ticks.innerHTML = `<svg viewBox="0 0 16 11" aria-hidden="true">${paths}</svg>`;
    return ticks;
  }

  // Botão dentro da mensagem: abre as opções (quando tem ação) ou só informa (ex.: "ir para o site")
  function createCta(message, chat) {
    const { cta } = message;
    const isAction = Boolean(cta.action);
    const node = el(isAction ? 'button' : 'div', 'bubble__cta');
    if (isAction) {
      node.type = 'button';
      node.addEventListener('click', () => openOptions(chat.id, message.id));
    }
    node.append(svgIcon(cta.action === 'options' ? ICON_LIST : ICON_LINK), el('span', '', cta.label));
    return node;
  }

  /* ---------- Estado ---------- */

  const getChat = (id) => state.chats.find((chat) => chat.id === id);
  const activeChat = () => getChat(state.activeId);

  // Última mensagem de verdade (avisos do sistema não contam)
  function lastMessage(chat) {
    const content = chat.messages.filter((message) => message.from !== 'system');
    return content[content.length - 1];
  }

  // Momento da última atividade: a última mensagem ou, numa conversa vazia, quando foi criada
  function lastActivity(chat) {
    const last = lastMessage(chat);
    return last ? last.time : chat.createdAt ?? 0;
  }

  function later(fn, ms) {
    state.timers.push(setTimeout(fn, ms));
  }

  function clearTimers() {
    state.timers.forEach((id) => clearTimeout(id));
    state.timers = [];
  }

  /* ---------- Renderização ---------- */

  function refresh({ scrollToEnd = false } = {}) {
    renderRail();
    renderFilters();
    renderList();
    renderHeader();
    renderMessages(scrollToEnd);
  }

  function renderRail() {
    const unreadChats = state.chats.filter((chat) => chat.unread > 0).length;
    els.railBadge.textContent = String(unreadChats);
    els.railBadge.hidden = unreadChats === 0;
  }

  function renderFilters() {
    const chips = FILTERS.map((filter) => {
      const count = state.chats.filter(filter.test).length;
      const label = filter.counted ? `${filter.label} ${count}` : filter.label;
      const active = state.filter === filter.id;

      const chip = el('button', 'chip', label);
      chip.type = 'button';
      chip.dataset.filter = filter.id;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', String(active));
      return chip;
    });

    // Botão decorativo "+", como no WhatsApp Web
    const more = el('span', 'chip chip--round', '+');
    more.setAttribute('aria-hidden', 'true');

    els.filters.replaceChildren(...chips, more);
  }

  function renderList() {
    // Mantém o foco no item da lista mesmo quando ela é redesenhada
    const focusedId = els.list.contains(document.activeElement) ? document.activeElement.dataset.id : undefined;

    const query = normalize(state.query.trim());
    const filter = FILTERS.find((item) => item.id === state.filter);
    const chats = state.chats
      .filter((chat) => filter.test(chat) && normalize(chat.name).includes(query))
      .sort((a, b) => lastActivity(b) - lastActivity(a));

    const items = chats.length
      ? chats.map(renderChatItem)
      : [el('li', 'chat-list__empty', 'Nenhuma conversa encontrada')];
    els.list.replaceChildren(...items);

    if (focusedId) {
      const button = els.list.querySelector(`[data-id="${focusedId}"]`);
      if (button) button.focus({ preventScroll: true });
    }
  }

  function previewNode(chat, last) {
    const preview = el('span', 'chat-item__preview');
    if (chat.typing) {
      preview.classList.add('is-typing');
      preview.textContent = 'digitando…';
      return preview;
    }
    if (!last) {
      preview.textContent = 'Diga olá para começar';
      return preview;
    }
    if (last.from === 'me') preview.append(createTicks(last.status));
    // Em grupos, a prévia mostra quem falou, como "~Nome: texto"
    const author = chat.type === 'group' && last.from === 'them' ? `~${last.author}: ` : '';
    preview.append(author + stripFormatting(last.text));
    return preview;
  }

  function renderChatItem(chat) {
    const item = el('li');
    const button = el('button', 'chat-item');
    button.type = 'button';
    button.dataset.id = chat.id;

    if (chat.id === state.activeId) {
      button.classList.add('is-active');
      button.setAttribute('aria-current', 'true');
    }

    const last = lastMessage(chat);

    const topRow = el('div', 'chat-item__row');
    topRow.append(
      el('span', 'chat-item__name', chat.name),
      el('span', chat.unread ? 'chat-item__time is-unread' : 'chat-item__time', listTime(lastActivity(chat))),
    );

    const bottomRow = el('div', 'chat-item__row');
    bottomRow.append(previewNode(chat, last));
    if (chat.muted) bottomRow.append(svgIcon(ICON_MUTE, 'chat-item__muted'));
    if (chat.unread) bottomRow.append(el('span', 'badge', String(chat.unread)));

    const body = el('div', 'chat-item__body');
    body.append(topRow, bottomRow);
    button.append(createAvatar(chat), body);
    button.addEventListener('click', () => openChat(chat.id));

    item.append(button);
    return item;
  }

  function statusText(chat) {
    if (chat.typing) return 'digitando…';
    if (chat.type === 'group') return ['Você', ...chat.members].join(', ');
    if (chat.type === 'business') return '';
    if (chat.online) return 'online';
    return `visto por último ${relativeDay(chat.lastSeen).toLowerCase()} às ${formatTime(chat.lastSeen)}`;
  }

  function renderHeader() {
    const chat = activeChat();
    if (!chat) return;

    els.avatarSlot.replaceChildren(createAvatar(chat, 'avatar--sm'));
    els.name.textContent = chat.name;
    els.verified.hidden = !chat.verified;

    const text = statusText(chat);
    els.status.textContent = text;
    els.status.hidden = text === '';
    els.status.classList.toggle('is-typing', chat.typing);
  }

  function renderNotice(message) {
    return el('div', `notice notice--${message.kind}`, message.text);
  }

  function renderMessage(message, chat) {
    const isMine = message.from === 'me';
    const row = el('div', isMine ? 'msg msg--out' : 'msg msg--in');
    const bubble = el('div', 'bubble');
    const inner = el('div', 'bubble__inner');

    if (!isMine && chat.type === 'group') {
      const author = el('div', 'bubble__author', message.author);
      author.style.color = authorColor(message.author);
      inner.append(author);
    }

    // Resposta citando a mensagem anterior
    if (message.quote) {
      const quote = el('div', 'bubble__quote');
      quote.append(
        el('span', 'bubble__quote-author', message.quote.author),
        el('span', 'bubble__quote-text', message.quote.text),
      );
      inner.append(quote);
    }

    const text = el('span', 'bubble__text');
    formatText(message.text, text);

    const meta = el('span', 'bubble__meta', formatTime(message.time));
    if (isMine) meta.append(createTicks(message.status));

    inner.append(text, meta);
    bubble.append(inner);
    if (message.cta) bubble.append(createCta(message, chat));

    row.append(bubble);
    return row;
  }

  function renderMessages(scrollToEnd) {
    const chat = activeChat();
    if (!chat) return;

    const box = els.messages;
    const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const previousTop = box.scrollTop;

    const nodes = [];
    let currentDay = null;
    chat.messages.forEach((message) => {
      const day = startOfDay(message.time);
      if (day !== currentDay) {
        currentDay = day;
        nodes.push(el('div', 'day-separator', relativeDay(message.time)));
      }
      nodes.push(message.from === 'system' ? renderNotice(message) : renderMessage(message, chat));
    });
    box.replaceChildren(...nodes);

    // Desce até o fim se o usuário já estava lá (ou acabou de enviar); caso contrário, preserva a posição
    box.scrollTop = scrollToEnd || wasAtBottom ? box.scrollHeight : previousTop;
  }

  function updateComposer() {
    // Volta à altura de uma linha e cresce conforme o texto; oculto, não há o que medir
    els.input.style.height = '';
    if (els.input.scrollHeight) els.input.style.height = `${Math.min(els.input.scrollHeight, 120)}px`;
    els.composer.classList.toggle('has-text', els.input.value.trim() !== '');
  }

  /* ---------- Ações ---------- */

  function openChat(id) {
    const chat = getChat(id);
    if (!chat) return;

    const isSameChat = state.activeId === id;
    state.activeId = id;
    chat.unread = 0;

    els.app.classList.add('is-chat-open');
    els.emptyState.hidden = true;
    els.chatView.hidden = false;
    refresh({ scrollToEnd: !isSameChat });
    updateComposer();

    if (!MOBILE_QUERY.matches) els.input.focus();
  }

  function closeChat() {
    state.activeId = null;
    els.app.classList.remove('is-chat-open');
    els.chatView.hidden = true;
    els.emptyState.hidden = false;
    refresh();
  }

  // Gera conversas aleatórias novas, mas mantém a conversa "Banco" e sua jornada
  function regenerate() {
    clearTimers();
    closeOptions();
    resetFlow(state.bank);
    state.chats = [state.bank, ...WAData.generateChats()];
    closeChat();
  }

  function resetFlow(chat) {
    chat.queue = [];
    chat.busy = false;
    chat.typing = false;
  }

  function sendMessage(text, { quote, optionId } = {}) {
    const chat = activeChat();
    if (!chat) return;

    const message = { id: WAData.uid('m'), from: 'me', text, time: Date.now(), status: 'sent', quote };
    chat.messages.push(message);
    refresh({ scrollToEnd: true });

    later(() => {
      message.status = 'delivered';
      refresh();
    }, 500);
    later(() => {
      message.status = 'read';
      refresh();
    }, 1400);

    if (chat.flow) {
      enqueueFlow(chat, optionId ? WAJourney.answerOption(optionId) : WAJourney.respond(text));
    } else if (!chat.replyPending && Math.random() < 0.85) {
      // Nem toda mensagem recebe resposta, como numa conversa real
      scheduleReply(chat);
    }
  }

  /* ---------- Jornada roteirizada ---------- */

  // Passos do roteiro entram numa fila, para que as respostas saiam uma de cada vez
  function enqueueFlow(chat, steps) {
    chat.queue.push(...steps);
    if (!chat.busy) pumpFlow(chat);
  }

  function pumpFlow(chat) {
    const step = chat.queue.shift();
    if (!step) {
      chat.busy = false;
      chat.typing = false;
      refresh();
      return;
    }

    chat.busy = true;
    chat.typing = true;
    refresh();

    later(() => {
      chat.typing = false;
      chat.messages.push({ id: WAData.uid('m'), from: 'them', text: step.text, time: Date.now(), cta: step.cta });
      if (chat.id !== state.activeId) chat.unread += 1;
      refresh();
      later(() => pumpFlow(chat), 300);
    }, step.delay);
  }

  function openOptions(chatId, messageId) {
    state.optionsFrom = { chatId, messageId };
    els.optionList.replaceChildren(...WAJourney.options.map(renderOption));
    els.optionsModal.hidden = false;
    els.optionsClose.focus();
  }

  function closeOptions() {
    els.optionsModal.hidden = true;
    state.optionsFrom = null;
  }

  function renderOption(option) {
    const button = el('button', 'option-item');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');

    const text = el('span', 'option-item__text');
    text.append(el('span', 'option-item__title', option.title), el('span', 'option-item__desc', option.description));
    button.append(text, el('span', 'option-item__radio'));

    button.addEventListener('click', () => chooseOption(option, button));
    return button;
  }

  // Marca a opção e, logo depois, envia a escolha como mensagem (como no WhatsApp)
  function chooseOption(option, button) {
    if (button.getAttribute('aria-checked') === 'true') return;
    button.setAttribute('aria-checked', 'true');
    later(() => selectOption(option), 250);
  }

  function selectOption(option) {
    const from = state.optionsFrom;
    if (!from) return;

    const chat = activeChat();
    const source = chat && chat.id === from.chatId ? chat.messages.find((message) => message.id === from.messageId) : undefined;
    closeOptions();
    if (!chat || !source) return;

    sendMessage(`${option.title}\n${option.description}`, {
      quote: { author: chat.name, text: source.text },
      optionId: option.id,
    });
  }

  /* ---------- Conversas aleatórias ---------- */

  function scheduleReply(chat) {
    chat.replyPending = true;

    later(() => {
      chat.typing = true;
      refresh();
    }, 1800);

    later(() => {
      const lastSent = [...chat.messages].reverse().find((message) => message.from === 'me');
      chat.typing = false;
      chat.replyPending = false;
      receive(chat, WAData.generateReply(lastSent ? lastSent.text : '', chat.type));
    }, 3500 + Math.random() * 2000);
  }

  // Em grupos, quem responde é um dos participantes
  function receive(chat, text) {
    const author = chat.type === 'group' ? pick(chat.members) : undefined;
    chat.messages.push({ id: WAData.uid('m'), from: 'them', text, time: Date.now(), author });
    if (chat.id !== state.activeId) chat.unread += 1;
    refresh();
  }

  /* ---------- Eventos ---------- */

  els.filters.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    refresh();
  });

  els.bannerClose.addEventListener('click', () => {
    els.banner.hidden = true;
  });

  els.optionsClose.addEventListener('click', closeOptions);

  // Clicar fora da caixa fecha o modal
  els.optionsModal.addEventListener('click', (event) => {
    if (event.target === els.optionsModal) closeOptions();
  });

  els.composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = els.input.value.trim();
    if (!text || !activeChat()) return;

    els.input.value = '';
    updateComposer();
    sendMessage(text);
    els.input.focus();
  });

  // Enter envia; Shift+Enter quebra a linha
  els.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      els.composer.requestSubmit();
    }
  });

  els.input.addEventListener('input', updateComposer);

  els.search.addEventListener('input', () => {
    state.query = els.search.value;
    renderList();
  });

  // Setas para navegar entre as conversas pelo teclado
  els.search.addEventListener('keydown', (event) => {
    const first = els.list.querySelector('.chat-item');
    if (event.key === 'ArrowDown' && first) {
      event.preventDefault();
      first.focus();
    }
  });

  els.list.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...els.list.querySelectorAll('.chat-item')];
    const index = items.indexOf(document.activeElement);
    if (index === -1) return;

    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.min(items.length - 1, Math.max(0, index + step));
    items[next].focus();
  });

  els.regenerate.addEventListener('click', regenerate);
  els.backBtn.addEventListener('click', closeChat);

  // Esc fecha primeiro o modal de opções; depois, a conversa
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!els.optionsModal.hidden) closeOptions();
    else if (state.activeId) closeChat();
  });

  /* ---------- Início ---------- */

  state.bank = WAJourney.createChat();
  regenerate();
  updateComposer();
})();
