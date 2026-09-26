/**
 * Open-Smart-AI Model Arena (Side-by-Side Playground & Benchmark)
 * Compare two models in parallel with real-time latency, token throughput,
 * and preference voting leaderboard.
 */

class OpenSmartModelArena {
  constructor() {
    this.leaderboard = JSON.parse(localStorage.getItem('openaudio_arena_scores') || JSON.stringify({
      'gemini-2.5-flash': 42,
      'deepseek-r1': 48,
      'gpt-4o': 39,
      'claude-3-5-sonnet': 46,
      'llama-3-3-70b': 31
    }));
  }

  saveScores() {
    try {
      localStorage.setItem('openaudio_arena_scores', JSON.stringify(this.leaderboard));
    } catch (e) {}
  }

  vote(winnerModelId) {
    if (this.leaderboard[winnerModelId] !== undefined) {
      this.leaderboard[winnerModelId] += 1;
    } else {
      this.leaderboard[winnerModelId] = 1;
    }
    this.saveScores();
    if (window.sounds) window.sounds.playComplete();
    return this.leaderboard;
  }

  async runDualBattle(prompt, modelAId, modelBId, callbacksA, callbacksB) {
    const startTime = performance.now();

    const taskA = window.aiEngine.simulateSmartResponse(
      [{ role: 'user', content: prompt }],
      modelAId,
      {
        onChunk: (chunk, full) => {
          if (callbacksA.onChunk) callbacksA.onChunk(chunk, full);
        },
        onComplete: (full, meta) => {
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
          const tps = Math.round((meta.tokens || 150) / Math.max(0.5, elapsed));
          if (callbacksA.onComplete) {
            callbacksA.onComplete(full, { ...meta, elapsed: elapsed + 's', tps: tps + ' tok/s' });
          }
        }
      }
    );

    const taskB = window.aiEngine.simulateSmartResponse(
      [{ role: 'user', content: prompt }],
      modelBId,
      {
        onChunk: (chunk, full) => {
          if (callbacksB.onChunk) callbacksB.onChunk(chunk, full);
        },
        onComplete: (full, meta) => {
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
          const tps = Math.round((meta.tokens || 150) / Math.max(0.5, elapsed));
          if (callbacksB.onComplete) {
            callbacksB.onComplete(full, { ...meta, elapsed: elapsed + 's', tps: tps + ' tok/s' });
          }
        }
      }
    );

    await Promise.all([taskA, taskB]);
  }
}

window.modelArena = new OpenSmartModelArena();
