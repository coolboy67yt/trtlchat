document.addEventListener('DOMContentLoaded', () => {
  const chat = document.getElementById('chat');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  const sidebar = document.getElementById('sidebar');
  const API_URL = '/api/proxy';
  
  let aiPrompt = "You are an AI chatbot hosted on TrtlChat. You can use all markdown features, such as images, text formatting, and more."
  let chats = getChatsFromCookies();
  let currentChatId = chats.length > 0 ? chats[0].id : null;

  if (currentChatId === null) {
    currentChatId = createNewChat(false); // Create new chat if no chats exist
  }

  renderSidebar();
  loadChat(currentChatId);

  if (!chat || !input || !send || !sidebar) {
    console.error('Missing one or more critical elements.');
    return;
  }
function appendMessage(content, sender, isLoading = false) {
  const div = document.createElement('div');
  div.classList.add('message', sender);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  if (sender === 'assistant') {
    contentDiv.innerHTML = marked.parse(content);
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
  if (saveImmediately) saveChatsToCookies();
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
      saveChatsToCookies();
    } else {
      updateassistantMessageTyped('⚠ Something went wrong. Please try again later.');
    }
  })
  .catch((error) => {
    // Log and show error message if fetch fails
    console.error('Error details:', error); // Log error details for debugging
    updateassistantMessageTyped(`⚠ Error code ${error?.code || 'UNKNOWN'}`);
  });
}

function renderSidebar() {
  const textDiv = sidebar.querySelector('.text');
  textDiv.innerHTML = `
    <h2>Your Chats</h2>
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
        <div class="button-container">
          <button class="newchat" onclick="createNewChat()">+ New Chat</button></div>
  `;
}

send.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

// do stuff
window.loadChat = loadChat;
window.deleteChat = deleteChat;
window.createNewChat = createNewChat;

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