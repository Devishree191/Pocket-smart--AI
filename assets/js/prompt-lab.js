/**
 * Open-Smart-AI Prompt Engineering Lab & Template Hub
 * Browse curated templates, interpolate dynamic variables {{var}},
 * save custom templates, and directly dispatch to chat.
 */

class OpenSmartPromptLab {
  constructor() {
    this.templates = [];
    this.activeFilter = 'All';
    this.loadTemplates();
  }

  loadTemplates() {
    const saved = localStorage.getItem('openaudio_custom_prompts');
    const customList = saved ? JSON.parse(saved) : [];
    const defaultList = (window.OPEN_SMART_DATA && window.OPEN_SMART_DATA.prompts) || [];
    this.templates = [...customList, ...defaultList];
  }

  saveCustomTemplate(title, category, template, tags = []) {
    const newPrompt = {
      id: 'custom_' + Date.now(),
      category: category || 'Custom',
      title,
      description: 'Custom user prompt template.',
      tags: tags.length ? tags : ['Custom'],
      template
    };

    const saved = localStorage.getItem('openaudio_custom_prompts');
    const customList = saved ? JSON.parse(saved) : [];
    customList.unshift(newPrompt);
    localStorage.setItem('openaudio_custom_prompts', JSON.stringify(customList));
    this.loadTemplates();
    return newPrompt;
  }

  extractVariables(templateStr) {
    const matches = templateStr.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }

  interpolate(templateStr, values) {
    let result = templateStr;
    for (const [key, val] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, val || `[${key}]`);
    }
    return result;
  }
}

window.promptLab = new OpenSmartPromptLab();
