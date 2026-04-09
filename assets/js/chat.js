/**
 * Tauira Rhizome Chat Widget
 * Sends user queries to the chat endpoint and displays responses.
 */

/* eslint-env browser */

/**
 * Initialise the chat widget inside a container.
 * @param {HTMLElement} container - DOM element to render the chat UI into.
 * @param {string} endpoint - URL of the chat serverless function.
 */
function initTauiraChat(container, endpoint) {
  if (!container) return;

  container.innerHTML = [
    '<div class="tauira-chat">',
    '  <div class="tauira-chat-messages" role="log" aria-live="polite"></div>',
    '  <form class="tauira-chat-form">',
    '    <label for="tauira-chat-input" class="sr-only">Ask the rhizome</label>',
    '    <input id="tauira-chat-input" type="text" placeholder="Ask the rhizome…" autocomplete="off" />',
    '    <button type="submit">Send</button>',
    '  </form>',
    '</div>'
  ].join('\n');

  var messagesEl = container.querySelector('.tauira-chat-messages');
  var formEl = container.querySelector('.tauira-chat-form');
  var inputEl = container.querySelector('#tauira-chat-input');

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var query = inputEl.value.trim();
    if (!query) return;

    appendMessage(messagesEl, 'user', query);
    inputEl.value = '';
    inputEl.disabled = true;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Chat request failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        appendMessage(messagesEl, 'assistant', data.response || 'No response.');
        if (data.referencedNodes && data.referencedNodes.length > 0) {
          appendMessage(messagesEl, 'system', 'Referenced nodes: ' + data.referencedNodes.join(', '));
        }
      })
      .catch(function (err) {
        appendMessage(messagesEl, 'error', err.message);
      })
      .finally(function () {
        inputEl.disabled = false;
        inputEl.focus();
      });
  });
}

/**
 * Append a message to the chat log.
 */
function appendMessage(container, role, text) {
  var el = document.createElement('div');
  el.className = 'tauira-chat-message tauira-chat-' + role;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}
