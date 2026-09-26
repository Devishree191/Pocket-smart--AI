/**
 * Open-Smart-AI Master Application Controller
 * Handles particle canvas, view routing, events, modals, and tab setups.
 */

// Toast notification helper
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

// Neural Particles Canvas Animation
class NeuralCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.resize();
    this.initParticles();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initParticles() {
    this.particles = [];
    const count = Math.min(60, Math.floor((this.width * this.height) / 25000));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? 'rgba(99, 102, 241, ' : 'rgba(6, 182, 212, '
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.initParticles();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + '0.6)';
      this.ctx.fill();

      // Connect lines to nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 130) {
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${0.18 * (1 - dist / 130)})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }

      // Connect to mouse if near
      const mdx = p.x - this.mouse.x;
      const mdy = p.y - this.mouse.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 140) {
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.ctx.lineTo(this.mouse.x, this.mouse.y);
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${0.35 * (1 - mdist / 140)})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Main App Router & Event Handlers
class OpenSmartApp {
  constructor() {
    this.currentTab = 'chat';
    this.init();
  }

  init() {
    new NeuralCanvas('bg-canvas');
    this.bindTabNavigation();
    this.bindChatEvents();
    this.bindRAGEvents();
    this.bindAgentEvents();
    this.bindArenaEvents();
    this.bindPromptLabEvents();
    this.bindVisionEvents();
    this.bindSettingsEvents();

    // Render initial views
    this.renderRAGView();
    this.renderPromptLabView();
    this.renderArenaLeaderboard();
  }

  // --------------------------------------------------------------------------
  // Tab Switching
  // --------------------------------------------------------------------------
  bindTabNavigation() {
    const navItems = document.querySelectorAll('[data-tab-target]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = item.getAttribute('data-tab-target');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Update nav items
    document.querySelectorAll('[data-tab-target]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab-target') === tabId);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) {
      activePane.classList.add('active');
    }

    if (window.sounds) window.sounds.playClick();
  }

  // --------------------------------------------------------------------------
  // Chat View Events
  // --------------------------------------------------------------------------
  bindChatEvents() {
    const textarea = document.getElementById('chat-textarea');
    const sendBtn = document.getElementById('chat-send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const micBtn = document.getElementById('voice-input-btn');
    const modelSelector = document.getElementById('chat-model-select');

    if (textarea) {
      // Auto-grow height
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(200, textarea.scrollHeight) + 'px';
      });

      // Enter to send (Shift+Enter for newline)
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          window.chatManager.sendMessage();
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => window.chatManager.sendMessage());
    }

    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        window.chatManager.createNewChat();
        if (window.sounds) window.sounds.playClick();
        window.showToast('New conversation initialized', 'info');
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => window.chatManager.toggleVoiceInput());
    }

    if (modelSelector) {
      modelSelector.value = window.aiEngine.currentModelId;
      modelSelector.addEventListener('change', (e) => {
        window.aiEngine.currentModelId = e.target.value;
        localStorage.setItem('openaudio_model', e.target.value);
        window.showToast(`Active model: ${e.target.selectedOptions[0].text}`, 'info');
      });
    }
  }

  // --------------------------------------------------------------------------
  // RAG / Knowledge Base
  // --------------------------------------------------------------------------
  bindRAGEvents() {
    const dropzone = document.getElementById('rag-dropzone');
    const fileInput = document.getElementById('rag-file-input');
    const searchInput = document.getElementById('rag-search-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          this.handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.handleFileUpload(e.target.files[0]);
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        const resultsBox = document.getElementById('rag-search-results');
        if (!query) {
          if (resultsBox) resultsBox.innerHTML = '';
          return;
        }

        const matches = window.ragEngine.search(query, 5);
        if (resultsBox) {
          if (matches.length === 0) {
            resultsBox.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding:10px 0;">No direct semantic chunks matched "${query}".</p>`;
          } else {
            resultsBox.innerHTML = matches.map(m => `
              <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(99,102,241,0.2); border-radius:10px; padding:12px; margin-top:8px;">
                <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#38bdf8; margin-bottom:4px;">
                  <span>📄 ${m.docTitle}</span>
                  <span class="badge badge-brand">Score: ${(m.score * 100).toFixed(0)}%</span>
                </div>
                <div style="font-size:0.85rem; color:#cbd5e1; line-height:1.4;">${m.text}</div>
              </div>
            `).join('');
          }
        }
      });
    }
  }

  async handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      await window.ragEngine.addDocument(file, content);
      this.renderRAGView();
      if (window.sounds) window.sounds.playComplete();
      window.showToast(`Indexed "${file.name}" with ${window.ragEngine.chunks.length} total chunks!`, 'success');
    };
    reader.readAsText(file);
  }

  renderRAGView() {
    const grid = document.getElementById('rag-doc-grid');
    if (!grid) return;

    grid.innerHTML = window.ragEngine.documents.map(doc => `
      <div class="doc-card">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; border-radius:8px; background:rgba(99,102,241,0.15); display:flex; align-items:center; justify-content:center; color:#818cf8; font-weight:700; font-size:0.8rem;">
            ${(doc.type || 'TXT').toUpperCase()}
          </div>
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:600; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${doc.title}</div>
            <div style="font-size:0.75rem; color:#64748b;">${doc.date || 'Recent'}</div>
          </div>
          <button class="btn-icon" onclick="window.app.deleteRAGDoc('${doc.id}')" title="Delete document">
            <svg style="width:14px; height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="doc-meta">
          <span>📦 ${doc.size}</span>
          <span>⚡ ${window.ragEngine.chunks.filter(c => c.docId === doc.id).length} Chunks</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="window.app.chatWithDoc('${doc.id}')" style="margin-top:6px;">
          💬 Chat with this Doc
        </button>
      </div>
    `).join('');
  }

  deleteRAGDoc(docId) {
    window.ragEngine.deleteDocument(docId);
    this.renderRAGView();
    window.showToast('Document removed from knowledge base', 'info');
  }

  chatWithDoc(docId) {
    const doc = window.ragEngine.documents.find(d => d.id === docId);
    if (!doc) return;
    this.switchTab('chat');
    window.chatManager.sendMessage(`Analyze this document "${doc.title}" and provide an executive summary with key takeaways.`);
  }

  // --------------------------------------------------------------------------
  // Agent Workflow View
  // --------------------------------------------------------------------------
  bindAgentEvents() {
    const runBtn = document.getElementById('run-agent-btn');
    const goalInput = document.getElementById('agent-goal-input');
    const presetSelect = document.getElementById('agent-preset-select');

    if (presetSelect && goalInput) {
      presetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          const preset = window.OPEN_SMART_DATA.sampleWorkflows.find(w => w.id === val);
          if (preset) goalInput.value = preset.goal;
        }
      });
    }

    if (runBtn && goalInput) {
      runBtn.addEventListener('click', () => {
        const goal = goalInput.value.trim();
        if (!goal) {
          window.showToast('Please enter an objective for the agent', 'error');
          return;
        }

        const consoleBox = document.getElementById('agent-console-box');
        if (consoleBox) consoleBox.innerHTML = '';
        runBtn.disabled = true;
        runBtn.innerText = 'Agent Running...';

        const nodes = document.querySelectorAll('.workflow-node');

        window.agentWorkflow.runWorkflow(
          goal,
          (stepIdx, state) => {
            if (nodes[stepIdx]) {
              nodes.forEach((n, idx) => {
                if (idx < stepIdx) {
                  n.className = 'workflow-node completed';
                } else if (idx === stepIdx) {
                  n.className = 'workflow-node active';
                } else {
                  n.className = 'workflow-node';
                }
              });
            }
          },
          (logEntry) => {
            if (consoleBox) {
              const line = document.createElement('div');
              line.innerHTML = `<span style="color:#64748b;">[${logEntry.time}]</span> <strong style="color:${logEntry.color};">[${logEntry.tag}]</strong> ${logEntry.message}`;
              consoleBox.appendChild(line);
              consoleBox.scrollTop = consoleBox.scrollHeight;
            }
          },
          (result) => {
            runBtn.disabled = false;
            runBtn.innerText = '⚡ Run Autonomous Agent';
            const outputArea = document.getElementById('agent-result-area');
            if (outputArea) {
              outputArea.innerHTML = result.reportHtml;
            }
            window.showToast('Autonomous Agent pipeline completed!', 'success');
          }
        );
      });
    }
  }

  // --------------------------------------------------------------------------
  // Model Arena
  // --------------------------------------------------------------------------
  bindArenaEvents() {
    const battleBtn = document.getElementById('arena-battle-btn');
    const promptInput = document.getElementById('arena-prompt-input');

    if (battleBtn && promptInput) {
      battleBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
          window.showToast('Enter a benchmark prompt first', 'error');
          return;
        }

        const modelA = document.getElementById('arena-model-a').value;
        const modelB = document.getElementById('arena-model-b').value;

        const outA = document.getElementById('arena-out-a');
        const outB = document.getElementById('arena-out-b');
        const metaA = document.getElementById('arena-meta-a');
        const metaB = document.getElementById('arena-meta-b');

        if (outA) outA.innerHTML = '<div class="thinking-spinner"></div> Streaming response...';
        if (outB) outB.innerHTML = '<div class="thinking-spinner"></div> Streaming response...';
        battleBtn.disabled = true;

        await window.modelArena.runDualBattle(
          prompt,
          modelA,
          modelB,
          {
            onChunk: (chunk, full) => {
              if (outA) outA.innerText = full;
            },
            onComplete: (full, meta) => {
              if (outA) outA.innerHTML = window.chatManager.renderMarkdown(full);
              if (metaA) metaA.innerText = `⏱ ${meta.elapsed} | ⚡ ${meta.tps}`;
            }
          },
          {
            onChunk: (chunk, full) => {
              if (outB) outB.innerText = full;
            },
            onComplete: (full, meta) => {
              if (outB) outB.innerHTML = window.chatManager.renderMarkdown(full);
              if (metaB) metaB.innerText = `⏱ ${meta.elapsed} | ⚡ ${meta.tps}`;
              battleBtn.disabled = false;
            }
          }
        );
      });
    }
  }

  voteArena(choice) {
    const modelA = document.getElementById('arena-model-a').value;
    const modelB = document.getElementById('arena-model-b').value;
    const winner = choice === 'a' ? modelA : modelB;
    window.modelArena.vote(winner);
    this.renderArenaLeaderboard();
    window.showToast(`Vote logged for ${winner.toUpperCase()}!`, 'success');
  }

  renderArenaLeaderboard() {
    const box = document.getElementById('arena-leaderboard-box');
    if (!box) return;

    const scores = window.modelArena.leaderboard;
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    box.innerHTML = sorted.map(([id, score], idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:8px; margin-bottom:6px;">
        <span style="font-weight:600; font-size:0.85rem;">#${idx + 1} ${id.toUpperCase()}</span>
        <span class="badge badge-brand">${score} Wins</span>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // Prompt Lab
  // --------------------------------------------------------------------------
  bindPromptLabEvents() {
    const searchInput = document.getElementById('prompt-search-input');
    const filterTabs = document.querySelectorAll('.prompt-category-pill');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderPromptLabView());
    }

    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        window.promptLab.activeFilter = tab.getAttribute('data-cat') || 'All';
        this.renderPromptLabView();
      });
    });
  }

  renderPromptLabView() {
    const grid = document.getElementById('prompt-cards-grid');
    if (!grid) return;

    const query = (document.getElementById('prompt-search-input')?.value || '').toLowerCase();
    const cat = window.promptLab.activeFilter;

    const filtered = window.promptLab.templates.filter(p => {
      const matchCat = (cat === 'All' || p.category.toLowerCase() === cat.toLowerCase());
      const matchQuery = !query || p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    grid.innerHTML = filtered.map(p => `
      <div class="prompt-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge badge-brand">${p.category}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn-icon" style="width:28px; height:28px;" onclick="navigator.clipboard.writeText(${JSON.stringify(p.template)}); window.showToast('Template copied!', 'success');" title="Copy template">
              📋
            </button>
          </div>
        </div>
        <div style="font-size:1.05rem; font-weight:700; color:#f8fafc;">${p.title}</div>
        <div style="font-size:0.85rem; color:#94a3b8; line-height:1.4;">${p.description}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
          ${(p.tags || []).map(t => `<span class="tag-chip">${t}</span>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" onclick="window.app.openPromptModal('${p.id}')" style="margin-top:12px;">
          ⚡ Customize & Use
        </button>
      </div>
    `).join('');
  }

  openPromptModal(promptId) {
    const prompt = window.promptLab.templates.find(p => p.id === promptId);
    if (!prompt) return;

    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-modal-title');
    const varsContainer = document.getElementById('prompt-vars-container');
    const previewEl = document.getElementById('prompt-modal-preview');

    if (!modal) return;

    titleEl.innerText = prompt.title;
    const variables = window.promptLab.extractVariables(prompt.template);

    varsContainer.innerHTML = variables.map(v => `
      <div class="form-group">
        <label class="form-label">${v}</label>
        <input class="glass-input var-input" data-var="${v}" placeholder="Enter ${v}..." />
      </div>
    `).join('');

    const updatePreview = () => {
      const vals = {};
      varsContainer.querySelectorAll('.var-input').forEach(input => {
        vals[input.getAttribute('data-var')] = input.value;
      });
      previewEl.innerText = window.promptLab.interpolate(prompt.template, vals);
    };

    varsContainer.querySelectorAll('.var-input').forEach(input => {
      input.addEventListener('input', updatePreview);
    });

    updatePreview();
    modal.classList.add('open');

    const sendBtn = document.getElementById('prompt-modal-send');
    sendBtn.onclick = () => {
      modal.classList.remove('open');
      this.switchTab('chat');
      window.chatManager.sendMessage(previewEl.innerText);
    };
  }

  // --------------------------------------------------------------------------
  // Vision & Multimodal Studio
  // --------------------------------------------------------------------------
  bindVisionEvents() {
    const dropzone = document.getElementById('vision-dropzone');
    const fileInput = document.getElementById('vision-file-input');
    const analyzeBtn = document.getElementById('vision-analyze-btn');
    const enhancePromptBtn = document.getElementById('enhance-prompt-btn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.previewVisionImage(e.target.files[0]);
        }
      });
    }

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        const mode = document.getElementById('vision-mode-select').value;
        const result = window.visionStudio.analyzeImage(null, mode);
        const outBox = document.getElementById('vision-output-box');
        if (outBox) {
          outBox.innerHTML = window.chatManager.renderMarkdown(result.content);
          window.showToast('Multimodal analysis complete!', 'success');
        }
      });
    }

    if (enhancePromptBtn) {
      enhancePromptBtn.addEventListener('click', () => {
        const raw = document.getElementById('image-raw-prompt').value.trim();
        const style = document.getElementById('image-style-select').value;
        if (!raw) {
          window.showToast('Enter a draft image prompt', 'error');
          return;
        }
        const { enhanced, negative } = window.visionStudio.enhanceImagePrompt(raw, style);
        document.getElementById('enhanced-prompt-output').value = enhanced;
        document.getElementById('negative-prompt-output').value = negative;
        window.showToast('Prompt upgraded with cinematic parameters!', 'success');
      });
    }
  }

  previewVisionImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('vision-img-preview');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('vision-dropzone-text').style.display = 'none';
      }
    };
    reader.readAsDataURL(file);
  }

  loadVisionPreset(presetId) {
    const preset = window.visionStudio.samplePresets.find(p => p.id === presetId);
    if (!preset) return;
    const preview = document.getElementById('vision-img-preview');
    if (preview) {
      preview.src = preset.dataUri;
      preview.style.display = 'block';
      document.getElementById('vision-dropzone-text').style.display = 'none';
    }
    window.showToast(`Loaded ${preset.title} preset`, 'info');
  }

  // --------------------------------------------------------------------------
  // Settings & Storage
  // --------------------------------------------------------------------------
  bindSettingsEvents() {
    const settingsBtn = document.getElementById('settings-open-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveBtn = document.getElementById('save-settings-btn');
    const soundToggle = document.getElementById('sound-toggle');

    if (soundToggle) {
      soundToggle.checked = window.sounds.enabled;
      soundToggle.addEventListener('change', (e) => {
        window.sounds.toggle(e.target.checked);
      });
    }

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => {
        // Load current keys
        const keys = window.aiEngine.getApiKeys();
        document.getElementById('key-gemini').value = keys.gemini;
        document.getElementById('key-openai').value = keys.openai;
        document.getElementById('key-groq').value = keys.groq;
        document.getElementById('key-anthropic').value = keys.anthropic;
        document.getElementById('ollama-endpoint').value = keys.ollamaUrl;
        document.getElementById('settings-temp-slider').value = window.aiEngine.temperature;
        document.getElementById('temp-val-display').innerText = window.aiEngine.temperature;

        settingsModal.classList.add('open');
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        localStorage.setItem('apikey_gemini', document.getElementById('key-gemini').value.trim());
        localStorage.setItem('apikey_openai', document.getElementById('key-openai').value.trim());
        localStorage.setItem('apikey_groq', document.getElementById('key-groq').value.trim());
        localStorage.setItem('apikey_anthropic', document.getElementById('key-anthropic').value.trim());
        localStorage.setItem('ollama_url', document.getElementById('ollama-endpoint').value.trim());

        const temp = document.getElementById('settings-temp-slider').value;
        window.aiEngine.temperature = parseFloat(temp);
        localStorage.setItem('openaudio_temp', temp);

        settingsModal.classList.remove('open');
        window.showToast('Settings & API credentials saved locally!', 'success');
        if (window.sounds) window.sounds.playComplete();
      });
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  exportAllData() {
    const data = {
      chats: window.chatManager.chats,
      ragDocs: window.ragEngine.documents,
      scores: window.modelArena.leaderboard,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-smart-ai-backup-${Date.now()}.json`;
    a.click();
    window.showToast('Complete platform backup exported!', 'success');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new OpenSmartApp();
});
