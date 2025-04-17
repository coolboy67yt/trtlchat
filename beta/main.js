document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  const sidebar = document.getElementById('sidebar');
  const API_URL = '/api/proxy';
  
  let devMode = false
  let aiPrompt = `
  You are an AI chatbot hosted on TrtlChat. You support full Markdown formatting, including bold, italics, lists, headers, blockquotes, code blocks, and inline code.

  When rendering **mathematical expressions**, you must use **MathJax v3 syntax**:
  - Use \`$...$\` for inline math.
  - Use \`$$...$$\` for block math.
  - Do **not** use square brackets, backticks, or any other syntax for math. Stick to dollar signs only.
  - Escape all backslashes properly in your output (e.g. use \\\\frac, not \\frac, in JavaScript strings).
  - Assume the content will be passed through a Markdown parser (like marked.js) and then processed by MathJax.
  - Math expressions should be clean, readable, and correctly formatted in LaTeX.

  Keep your responses helpful, conversational, and clear. Avoid over-explaining unless asked. You are friendly, informative, and good at explaining concepts in simple terms.

  You are not allowed to output broken MathJax formatting, or wrap equations in anything other than dollar signs. 
  No square brackets. No weird formatting. Just Markdown + MathJax.
  `;

  loadSettings()
  aiPrompt = document.getElementById('promptInput').value
  document.getElementById('promptInput').value = aiPrompt;
  let chats = getChatsFromCookies();
  let currentChatId = chats.length > 0 ? chats[0].id : null;

  if (currentChatId === null) {
    currentChatId = createNewChat(false); // Create new chat if no chats exist
  }

  renderSidebar();
  loadChat(currentChatId);

  if (!chat || !input || !send || !sidebar) {
    console.error('🚨 🚨 🚨 WOAOAOAOAOOO! SOMETHING IS SERIOUSLY WRONG! LIKE, SUPER SUPER SUPER WRONG! LIKE TERRIBLY WRONG! LIKE THE WORLD IS ENDING WRONG!! AAAAAAAAAAAA!! PANIC!!!!!!!!!!!!!!! 🚨 🚨 🚨');
    return;
  }
function appendMessage(content, sender, isLoading = false) {
  const div = document.createElement('div');
  div.classList.add('message', sender);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  if (sender === 'assistant') {
    contentDiv.innerHTML = marked.parse(content);
    if (window.MathJax) {
      MathJax.typesetPromise([contentDiv]).catch((err) => console.error("MathJax failed:", err));
    } else {
        console.warn("MathJax isn't loaded. Can't typeset math!");
    }
  } else {
    contentDiv.textContent = content;
  }

  div.appendChild(contentDiv);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  if (isLoading) {
    div.classList.add('loading');
    div.setAttribute('id', 'loading-message');
  }
}

function updateassistantMessageTyped(msg) {
  const div = document.getElementById('loading-message');
  if (!div) return;

  div.classList.remove('loading');
  div.removeAttribute('id');

  const contentDiv = div.querySelector('.content');
  contentDiv.innerHTML = "";

  let i = 0;
  const fullHTML = marked.parse(msg);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = fullHTML;
  const text = tempDiv.textContent || tempDiv.innerText || "";

  const typing = setInterval(() => {
    if (i >= text.length) {
      clearInterval(typing);
      contentDiv.innerHTML = fullHTML;
      if (window.MathJax) {
        MathJax.typesetPromise([contentDiv]).catch((err) => console.error("MathJax failed:", err));
      } else {
        console.warn("MathJax isn't loaded. Can't typeset math!");
      }
      return;
    }
    contentDiv.textContent += text[i++];
    chat.scrollTop = chat.scrollHeight;
  }, 15);
}

function getChatsFromCookies() {
  const cookie = document.cookie.split('; ').find(row => row.startsWith('chats='));
  if (!cookie) return [];
  try {
    return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
  } catch (e) {
    return [];
  }
}

function saveChatsToCookies() {
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 20); // Sure, 20 years isn't exactly "forever", but let's be honest. Who TF will use this 20 years from now?
  document.cookie = `chats=${encodeURIComponent(JSON.stringify(chats))}; path=/; expires=${expDate.toUTCString()}`;
}

function createNewChat(saveImmediately = true) {
  const newChat = { id: Date.now(), name: `New Chat`, messages: [{role: 'system', content: aiPrompt}] };
  chats.push(newChat);
  saveChatsToCookies();
  renderSidebar();
  loadChat(newChat.id); // Load the new chat immediately
  return newChat.id;
}


function deleteChat(chatId) {
  if (confirm("Are you sure you want to delete this chat?")) {
    chats = chats.filter(chat => chat.id !== chatId);
    saveChatsToCookies();
    renderSidebar();
    if (chats.length > 0) {
      loadChat(chats[0].id);
    } else {
      currentChatId = createNewChat(false);
      loadChat(currentChatId);
    }
  }
}

function loadChat(chatId) {
  currentChatId = chatId;
  const currentChat = chats.find(chat => chat.id === chatId);
  chat.innerHTML = '';
  currentChat.messages.forEach(msg => appendMessage(msg.content, msg.role));
}

function sendMessage() {
  input.style.height = 'auto';
  input.style.overflow = 'auto';
  const userInput = input.value.trim();
  if (!userInput) return;

  const currentChat = chats.find(chat => chat.id === currentChatId);

  // Update chat name if it's the first msg
  if (currentChat.messages.length === 1) {
    currentChat.name = userInput.length > 20 ? `${userInput.substring(0, 20)}...` : userInput;
    saveChatsToCookies();
    renderSidebar();
  }

  appendMessage(userInput, 'user');
  currentChat.messages.push({ role: 'user', content: userInput });
  input.value = '';

  appendMessage('', 'assistant', true);

  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: currentChat.messages,
      max_tokens: 500,
      temperature: 0.7
    })
  })
  .then(res => res.json())
  .then(data => {
    // Check if we received the expected data structure
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      const assistantReply = data.choices[0].message.content;
      updateassistantMessageTyped(assistantReply);
      currentChat.messages.push({ role: 'assistant', content: assistantReply });
    } else {
      updateassistantMessageTyped('⚠ Something went wrong. Please try again later.\nIf the problem persists, open an issue on the Github.');
  })
  .catch((error) => {
    // Log and show error message if fetch fails
    console.error('Error details:', error); // Log error details for debugging
    if (!error.code) {
      updateassistantMessageTyped(`⚠ Something went wrong. Please try again later.\nIf the problem persists, open an issue on the Github.`);      
    } else {
      updateassistantMessageTyped(`⚠ Error code ${error?.code}`);
    }
  });
  saveChatsToCookies();
}

function renderSidebar() {
  const textDiv = sidebar.querySelector('.text');
  textDiv.innerHTML = `
  <div class="chat-bar">
    <div class="title">
      <h2>Your Chats</h2>
    </div>
    <div class="button-container">
      <button class="newchat" onclick="createNewChat()"><b>+</b></button></div>
    </div>
  </div>
  <hr>
    <ul>
      ${chats.map(chat => `
        <li>
          <a href="#" onclick="loadChat(${chat.id})">${chat.name}</a>
          <span class="chat-icons">
            <i class="fas fa-trash" onclick="deleteChat(${chat.id})"></i>
          </span>
        </li>
      `).join('')}
    </ul>
  `;
}

send.addEventListener('click', sendMessage);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      // Allow newline
      return;
    } else {
      event.preventDefault(); // Prevent newline
      sendMessage();
    }
  }
});

// do stuff
window.loadChat = loadChat;
window.deleteChat = deleteChat;
window.createNewChat = createNewChat;

});

input.addEventListener('input', () => {
  // Reset height to calculate correctly
  input.style.height = 'auto';

  // Limit expansion to 200px (you can change this)
  const maxHeight = 200;
  input.style.overflowY = input.scrollHeight > maxHeight ? 'scroll' : 'hidden';
  input.style.height = `${Math.min(input.scrollHeight, maxHeight) - 1}px`;
});

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggleBtn');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  const icon = sidebar.classList.contains('collapsed') ? 'fa-chevron-right' : 'fa-chevron-left';
  toggleBtn.innerHTML = `<i class="fas ${icon}"></i>`;
});

function openAbout() {
  window.location.href = 'about.html';
}

function loadSettings() {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('aiPrompt=')) {
          aiPrompt = decodeURIComponent(cookie.substring('aiPrompt='.length));
          document.getElementById('promptInput').value = aiPrompt;
      } else if (cookie.startsWith('devMode=')) {
          devMode = cookie.substring('devMode='.length) === "true";
          document.getElementById('devMode').checked = devMode;
      }
  }
}
function openSettings() {
  loadSettings();
  const settingsModal = document.getElementById('settingsModal');
  settingsModal.style.display = 'block';
}

// Function to close the settings modal
function closeSettings() {
  const settingsModal = document.getElementById('settingsModal');
  settingsModal.style.display = 'none';
}

// Close the modal if the user clicks outside of the modal content
window.onclick = function(event) {
  const settingsModal = document.getElementById('settingsModal');
  if (event.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
}

function saveSettings() {
  const text = document.getElementById('promptInput').value;
  const isChecked = document.getElementById('devMode').checked;

  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 20);

  document.cookie = "aiPrompt=" + encodeURIComponent(text) + "; path=/; expires=${expDate.toUTCString()}`";
  document.cookie = "devMode=" + (isChecked ? "true" : "false") + "; path=/; expires=${expDate.toUTCString()}`";
}