/**
 * Open-Smart-AI Chat & Artifact Live Preview Engine
 * Handles streaming UI, Markdown & Code rendering, Deep Thinking accordions,
 * Claude-style Artifact sandboxing, Speech-to-Text & Text-to-Speech.
 */

class OpenSmartChat {
  constructor() {
    this.chats = [];
    this.activeChatId = null;
    this.isGenerating = false;
    this.speechRecognition = null;
    this.isRecording = false;

    this.initSpeech();
    this.loadChats();
  }

  initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const textarea = document.getElementById('chat-textarea');
        if (textarea) {
          textarea.value = (textarea.value ? textarea.value + ' ' : '') + transcript;
          textarea.focus();
        }
        this.stopVoiceInput();
      };

      this.speechRecognition.onerror = () => {
        this.stopVoiceInput();
      };

      this.speechRecognition.onend = () => {
        this.stopVoiceInput();
      };
    }
  }

  toggleVoiceInput() {
    if (!this.speechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const micBtn = document.getElementById('voice-input-btn');
    if (this.isRecording) {
      this.speechRecognition.stop();
      this.stopVoiceInput();
    } else {
      try {
        this.speechRecognition.start();
        this.isRecording = true;
        if (micBtn) micBtn.classList.add('recording');
        if (window.sounds) window.sounds.playClick();
      } catch (e) {
        this.stopVoiceInput();
      }
    }
  }

  stopVoiceInput() {
    this.isRecording = false;
    const micBtn = document.getElementById('voice-input-btn');
    if (micBtn) micBtn.classList.remove('recording');
  }

  speakText(text, buttonElement) {
    if (!('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (buttonElement) buttonElement.innerHTML = `<span>🔊 Read</span>`;
      return;
    }

    // Strip markdown formatting and code blocks for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/[#*_`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;

    if (buttonElement) {
      buttonElement.innerHTML = `<span class="audio-wave"><span class="audio-bar"></span><span class="audio-bar"></span><span class="audio-bar"></span></span> Stop`;
    }

    utterance.onend = () => {
      if (buttonElement) buttonElement.innerHTML = `<span>🔊 Read</span>`;
    };

    window.speechSynthesis.speak(utterance);
  }

  loadChats() {
    const saved = localStorage.getItem('openaudio_chat_history');
    if (saved) {
      try {
        this.chats = JSON.parse(saved);
      } catch (e) {
        this.chats = [];
      }
    }

    if (this.chats.length === 0) {
      this.createNewChat('Welcome to Open-Smart-AI');
    } else {
      this.activeChatId = this.chats[0].id;
    }
  }

  saveChats() {
    try {
      localStorage.setItem('openaudio_chat_history', JSON.stringify(this.chats));
    } catch (e) {}
  }

  getActiveChat() {
    return this.chats.find(c => c.id === this.activeChatId) || this.chats[0];
  }

  createNewChat(title = 'New Exploration') {
    const newChat = {
      id: 'chat_' + Date.now(),
      title,
      createdAt: new Date().toISOString(),
      messages: []
    };
    this.chats.unshift(newChat);
    this.activeChatId = newChat.id;
    this.saveChats();
    this.renderChatList();
    this.renderMessages();
    return newChat;
  }

  deleteChat(chatId) {
    this.chats = this.chats.filter(c => c.id !== chatId);
    if (this.chats.length === 0) {
      this.createNewChat();
    } else {
      this.activeChatId = this.chats[0].id;
    }
    this.saveChats();
    this.renderChatList();
    this.renderMessages();
  }

  renderChatList() {
    const container = document.getElementById('chat-history-list');
    if (!container) return;

    container.innerHTML = this.chats.map(chat => `
      <div class="nav-item ${chat.id === this.activeChatId ? 'active' : ''}" onclick="window.chatManager.switchChat('${chat.id}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span class="sidebar-text" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${this.escapeHtml(chat.title)}</span>
        <button class="btn-icon" style="margin-left: auto; width: 20px; height: 20px;" onclick="event.stopPropagation(); window.chatManager.deleteChat('${chat.id}')" title="Delete conversation">
          <svg style="width: 12px; height: 12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `).join('');
  }

  switchChat(chatId) {
    this.activeChatId = chatId;
    this.renderChatList();
    this.renderMessages();
    if (window.sounds) window.sounds.playClick();
  }

  async sendMessage(customText = null) {
    if (this.isGenerating) return;

    const textarea = document.getElementById('chat-textarea');
    const text = (customText || (textarea ? textarea.value : '')).trim();
    if (!text) return;

    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }

    const currentChat = this.getActiveChat();
    // Auto-title from first user prompt
    if (currentChat.messages.length === 0) {
      currentChat.title = text.slice(0, 32) + (text.length > 32 ? '...' : '');
      this.renderChatList();
    }

    // Append user message
    const userMsg = { role: 'user', content: text, timestamp: new Date().toLocaleTimeString() };
    currentChat.messages.push(userMsg);
    this.renderMessages();
    if (window.sounds) window.sounds.playSend();

    // Check if RAG context should be attached
    let finalQuery = text;
    if (window.ragEngine && window.ragEngine.chunks.length > 0) {
      const retrieved = window.ragEngine.search(text, 3);
      if (retrieved.length > 0) {
        finalQuery = window.ragEngine.formatContextPrompt(text, retrieved);
      }
    }

    // Append assistant placeholder
    const assistantMsg = {
      role: 'assistant',
      content: '',
      thinking: '',
      model: window.aiEngine.currentModelId,
      timestamp: new Date().toLocaleTimeString()
    };
    currentChat.messages.push(assistantMsg);

    this.isGenerating = true;
    this.updateSendButtonState();

    const assistantMsgIndex = currentChat.messages.length - 1;

    try {
      await window.aiEngine.streamResponse(
        currentChat.messages.slice(0, -1).concat([{ role: 'user', content: finalQuery }]),
        { modelId: window.aiEngine.currentModelId },
        {
          onThinking: (thinkingChunk) => {
            assistantMsg.thinking = thinkingChunk;
            this.updateLiveMessage(assistantMsgIndex);
          },
          onChunk: (chunk, fullText) => {
            assistantMsg.content = fullText;
            this.updateLiveMessage(assistantMsgIndex);
          },
          onComplete: (fullText, meta) => {
            assistantMsg.content = fullText;
            this.isGenerating = false;
            this.updateSendButtonState();
            this.saveChats();
            this.renderMessages();
            if (window.sounds) window.sounds.playComplete();

            // Auto-detect artifact code for live preview
            this.checkForArtifact(fullText);
          }
        }
      );
    } catch (err) {
      assistantMsg.content = `⚠️ **Error during generation:** ${err.message || 'Unable to connect to AI engine.'}`;
      this.isGenerating = false;
      this.updateSendButtonState();
      this.renderMessages();
    }
  }

  updateSendButtonState() {
    const btn = document.getElementById('chat-send-btn');
    if (btn) {
      btn.disabled = this.isGenerating;
      btn.innerHTML = this.isGenerating 
        ? `<div class="thinking-spinner" style="width: 18px; height: 18px; border-top-color: white;"></div>`
        : `<svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    }
  }

  updateLiveMessage(index) {
    const currentChat = this.getActiveChat();
    const msg = currentChat.messages[index];
    const msgContainer = document.getElementById(`msg-${index}`);
    if (msgContainer) {
      msgContainer.innerHTML = this.formatMessageHtml(msg, index);
    } else {
      this.renderMessages();
    }

    const scrollBox = document.getElementById('chat-messages-scroll');
    if (scrollBox) {
      scrollBox.scrollTop = scrollBox.scrollHeight;
    }
  }

  renderMessages() {
    const container = document.getElementById('chat-messages-scroll');
    if (!container) return;

    const currentChat = this.getActiveChat();

    if (currentChat.messages.length === 0) {
      container.innerHTML = `
        <div class="chat-welcome">
          <div class="welcome-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><circle cx="12" cy="12" r="6"/></svg>
          </div>
          <h1 class="welcome-title">Open-Smart-AI Nexus</h1>
          <p class="welcome-desc">
            Next-generation autonomous AI workstation with multi-model streaming, Claude-style live artifacts, in-memory RAG, and agentic workflows.
          </p>
          <div class="suggestion-grid">
            <div class="suggestion-card" onclick="window.chatManager.sendMessage('Build an interactive single-page artifact calculator and dashboard in HTML/CSS/JS')">
              <span class="suggestion-icon">⚡</span>
              <div class="suggestion-title">Live Web Artifact</div>
              <div class="suggestion-snippet">Create a glassmorphic interactive web widget with live sandbox preview.</div>
            </div>
            <div class="suggestion-card" onclick="window.chatManager.sendMessage('Design a high-performance LRU Cache class with O(1) time complexity in JavaScript')">
              <span class="suggestion-icon">🧠</span>
              <div class="suggestion-title">Deep Code Refactoring</div>
              <div class="suggestion-snippet">Analyze time complexity, memory bottlenecks, and idiomatic patterns.</div>
            </div>
            <div class="suggestion-card" onclick="window.chatManager.sendMessage('Explain the paradigm shift from basic LLM inference to test-time compute in 2026')">
              <span class="suggestion-icon">🔬</span>
              <div class="suggestion-title">AI Frontiers & Reasoning</div>
              <div class="suggestion-snippet">Synthesize technical breakthroughs in reasoning models and test-time compute.</div>
            </div>
            <div class="suggestion-card" onclick="window.chatManager.sendMessage('How do hybrid vector + BM25 retrieval algorithms improve RAG accuracy?')">
              <span class="suggestion-icon">📚</span>
              <div class="suggestion-title">RAG Architecture</div>
              <div class="suggestion-snippet">Inspect sparse keyword matching alongside dense vector embeddings.</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = currentChat.messages.map((msg, idx) => `
      <div class="message-row ${msg.role}" id="msg-${idx}">
        ${this.formatMessageHtml(msg, idx)}
      </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
  }

  formatMessageHtml(msg, idx) {
    const isUser = msg.role === 'user';
    const avatar = isUser
      ? `<div class="avatar avatar-user">You</div>`
      : `<div class="avatar avatar-ai">AI</div>`;

    let thinkingHtml = '';
    if (msg.thinking) {
      thinkingHtml = `
        <div class="thinking-box">
          <div class="thinking-header" onclick="this.nextElementSibling.classList.toggle('hidden');">
            <span class="thinking-status">
              <span class="thinking-spinner"></span>
              <span>Thinking Process (${msg.thinking.split(' ').length} tokens)</span>
            </span>
            <span>▼</span>
          </div>
          <div class="thinking-body">${this.escapeHtml(msg.thinking)}</div>
        </div>
      `;
    }

    const parsedContent = isUser ? this.escapeHtml(msg.content) : this.renderMarkdown(msg.content);

    const actionButtons = !isUser ? `
      <div class="message-actions">
        <button class="msg-action-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(msg.content)}); window.showToast('Copied to clipboard!', 'success');">
          📋 Copy
        </button>
        <button class="msg-action-btn" onclick="window.chatManager.speakText(${JSON.stringify(msg.content)}, this)">
          🔊 Read
        </button>
      </div>
    ` : '';

    return `
      ${avatar}
      <div class="message-content">
        <div class="message-bubble">
          ${thinkingHtml}
          ${parsedContent}
        </div>
        ${actionButtons}
      </div>
    `;
  }

  renderMarkdown(text) {
    if (!text) return '';

    // Handle code blocks with preview buttons
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let html = text.replace(codeBlockRegex, (match, lang, code) => {
      const language = (lang || 'code').toLowerCase();
      const isPreviewable = ['html', 'htm', 'svg', 'javascript', 'js'].includes(language);
      const encodedCode = encodeURIComponent(code);

      const previewBtn = isPreviewable ? `
        <button class="code-btn preview-btn" onclick="window.chatManager.openArtifact('${encodedCode}', '${language}')">
          ⚡ Live Preview
        </button>
      ` : '';

      return `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span>${language}</span>
            <div class="code-header-actions">
              ${previewBtn}
              <button class="code-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedCode}')); window.showToast('Code copied!', 'success');">
                📋 Copy
              </button>
            </div>
          </div>
          <pre><code>${this.escapeHtml(code)}</code></pre>
        </div>
      `;
    });

    // Bold, italics, blockquotes, headers
    html = html
      .replace(/^### (.*$)/gim, '<h3 style="color:#f8fafc; font-size:1.15rem; margin:12px 0 6px;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#f8fafc; font-size:1.35rem; margin:16px 0 8px;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#f8fafc; font-size:1.55rem; margin:20px 0 10px;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^> (.*$)/gim, '<blockquote style="border-left:3px solid #6366f1; padding:4px 12px; margin:10px 0; color:#94a3b8; background:rgba(99,102,241,0.06); border-radius:4px;">$1</blockquote>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n+/g, '<br><br>');

    return html;
  }

  checkForArtifact(text) {
    const match = text.match(/```(html|svg)\n([\s\S]*?)```/i);
    if (match) {
      const code = match[2];
      const lang = match[1];
      this.openArtifact(encodeURIComponent(code), lang);
    }
  }

  openArtifact(encodedCode, lang) {
    const code = decodeURIComponent(encodedCode);
    const pane = document.getElementById('artifact-pane');
    const iframe = document.getElementById('artifact-frame');
    const codeView = document.getElementById('artifact-code-view');

    if (!pane || !iframe) return;

    pane.classList.remove('hidden');

    let previewContent = code;
    if (lang === 'svg') {
      previewContent = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; background:#0b0f19; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden;">
          ${code}
        </body>
        </html>
      `;
    }

    iframe.srcdoc = previewContent;
    if (codeView) {
      codeView.innerHTML = `<pre style="padding: 20px;"><code>${this.escapeHtml(code)}</code></pre>`;
    }

    if (window.sounds) window.sounds.playClick();
  }

  closeArtifact() {
    const pane = document.getElementById('artifact-pane');
    if (pane) pane.classList.add('hidden');
  }

  toggleArtifactFullscreen() {
    const pane = document.getElementById('artifact-pane');
    if (pane) pane.classList.toggle('fullscreen');
  }

  switchArtifactTab(tab) {
    const frame = document.getElementById('artifact-frame-container');
    const codeView = document.getElementById('artifact-code-view');
    const tabs = document.querySelectorAll('.artifact-tab-btn');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'preview') {
      if (frame) frame.style.display = 'block';
      if (codeView) codeView.style.display = 'none';
      tabs[0]?.classList.add('active');
    } else {
      if (frame) frame.style.display = 'none';
      if (codeView) codeView.style.display = 'block';
      tabs[1]?.classList.add('active');
    }
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.chatManager = new OpenSmartChat();
