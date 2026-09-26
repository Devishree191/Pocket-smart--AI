/**
 * Open-Smart-AI Sample Data & Templates Library
 * Rich preloaded resources for instantaneous exploration
 */

window.OPEN_SMART_DATA = {
  prompts: [
    {
      id: 'fullstack-arch',
      category: 'Coding',
      title: 'Full-Stack Architecture Plan',
      description: 'Generate production-ready system architecture, database schema, and API contracts.',
      tags: ['Architecture', 'System Design', 'Backend'],
      template: 'Design an enterprise-grade full-stack architecture for {{projectName}} in {{stack}}. Include:\n1. High-level component diagram & data flow\n2. Database schema (PostgreSQL/Prisma schema)\n3. REST/GraphQL API endpoints specification\n4. Authentication & Security model (JWT, RBAC)\n5. Scalability & caching strategy (Redis, CDN)'
    },
    {
      id: 'code-refactor',
      category: 'Coding',
      title: 'Deep Code Refactorer & Optimizer',
      description: 'Audit code for algorithmic complexity, modern best practices, and memory efficiency.',
      tags: ['Refactoring', 'Performance', 'Clean Code'],
      template: 'Act as a Principal Software Engineer. Audit and refactor the following {{language}} code:\n```{{language}}\n{{codeSnippet}}\n```\nProvide:\n1. Complexity analysis (Big-O Time & Space)\n2. Identified anti-patterns and performance bottlenecks\n3. Modern, type-safe, idiomatic refactored version\n4. Unit test suite covering edge cases'
    },
    {
      id: 'claude-artifact-creator',
      category: 'Coding',
      title: 'Interactive Web Artifact Generator',
      description: 'Create a standalone single-file interactive web app with Tailwind/CSS and JS.',
      tags: ['Artifact', 'Frontend', 'Interactive'],
      template: 'Create a fully functional, highly polished interactive single-file HTML/CSS/JavaScript web artifact for {{appType}}. Make it visually stunning with modern glassmorphism, responsive controls, smooth animations, and zero external dependencies.'
    },
    {
      id: 'agent-spec-builder',
      category: 'AI Agents',
      title: 'Autonomous Agent Tool & Loop Spec',
      description: 'Specify an autonomous AI agent with tools, memory store, and execution loop.',
      tags: ['Agents', 'LangChain', 'Tool Calling'],
      template: 'Define a complete autonomous agent specification for {{agentRole}}. Detail:\n- Persona and system instructions\n- Tool calling declarations (JSON Schema for 4 specialized tools)\n- Memory management (short-term buffer vs vector long-term)\n- Reflection and self-correction loop\n- Error recovery guidelines'
    },
    {
      id: 'deep-research',
      category: 'Research',
      title: 'Deep Research & Synthesis Memo',
      description: 'Perform an exhaustive multi-angle executive research report on emerging topics.',
      tags: ['Research', 'Analysis', 'Executive'],
      template: 'Conduct a deep analytical research breakdown on "{{topic}}". Structure the briefing as:\n- Executive Summary & Key Takeaways\n- Historical Context & Technical Evolution\n- Current Industry Landscape & Leading Players\n- Technical Trade-offs & Limitations\n- 3-5 Year Future Outlook & Strategic Recommendations'
    },
    {
      id: 'security-audit',
      category: 'Security',
      title: 'Smart Contract & API Security Audit',
      description: 'Find OWASP Top 10 vulnerabilities, injection flaws, and authorization bypasses.',
      tags: ['Security', 'Audit', 'OWASP'],
      template: 'Perform an adversarial security review of this {{systemType}} architecture/endpoint. Check for:\n1. Authentication & broken access control\n2. SQL/NoSQL injection and sanitization\n3. Rate limiting and DoS vectors\n4. Data exposure and secrets leaks\nProvide explicit remediation code patches.'
    },
    {
      id: 'data-storyteller',
      category: 'Data Science',
      title: 'Data Storyteller & Metric Insights',
      description: 'Transform raw metrics and JSON datasets into actionable business narratives.',
      tags: ['Data', 'Analytics', 'Visualization'],
      template: 'Analyze the following dataset/metrics on {{businessDomain}}:\n{{dataInput}}\nExtract:\n- Top 3 surprising trends or anomalies\n- Correlation vs causation hypotheses\n- Visual chart recommendations (chart types, axis setup)\n- Actionable quarterly growth levers'
    },
    {
      id: 'prompt-optimizer',
      category: 'AI Agents',
      title: 'Meta-Prompt Optimizer & Evaluator',
      description: 'Upgrade any basic prompt into an expert few-shot chain-of-thought prompt.',
      tags: ['Prompt Engineering', 'Meta', 'Optimization'],
      template: 'Optimize the following draft prompt for higher accuracy and deterministic output:\nDraft: "{{draftPrompt}}"\nApply:\n- Explicit role anchoring & domain constraints\n- Step-by-step Chain-of-Thought (CoT) instructions\n- Structured JSON/Markdown output formatting\n- Few-shot positive and negative examples'
    },
    {
      id: 'ui-design-tokens',
      category: 'Design',
      title: 'Design System & CSS Token Generator',
      description: 'Create harmonious HSL color palettes, typography scales, and glassmorphic tokens.',
      tags: ['UI/UX', 'Design System', 'CSS'],
      template: 'Design a cohesive modern design system for a {{productType}} in {{vibeTheme}} style. Provide:\n- CSS custom properties (color shades from 50 to 950)\n- Typography fluid clamp scale\n- Glassmorphic backdrop filters and layered box shadows\n- Micro-interaction keyframe animations'
    },
    {
      id: 'growth-strategy',
      category: 'Business',
      title: 'Product-Led Growth (PLG) Playbook',
      description: 'Formulate user acquisition, onboarding flywheel, and retention mechanics.',
      tags: ['Growth', 'Marketing', 'SaaS'],
      template: 'Draft a comprehensive PLG strategy for {{saasProduct}}. Include:\n- High-velocity viral loop or friction-free freemium onramp\n- "Aha!" moment optimization in first 3 minutes\n- Expansion revenue triggers and usage-based tiers\n- Retention telemetry & churn warning triggers'
    }
  ],

  sampleDocs: [
    {
      id: 'doc-smart-ai-whitepaper',
      title: 'Open-Smart-AI Architecture & Guide.md',
      type: 'markdown',
      size: '18.4 KB',
      date: '2026-09-26',
      content: `# Open-Smart-AI: Next-Generation Agentic Framework & RAG Studio

## 1. Executive Overview
Open-Smart-AI is an open-source, modular AI workstation engineered for developers, researchers, and enterprises. It provides local-first intelligence, seamless multi-model switching (Google Gemini 2.5 Flash, DeepSeek-R1, OpenAI GPT-4o, Claude 3.5 Sonnet, and Ollama), in-browser Retrieval-Augmented Generation (RAG), and autonomous agent workflows.

## 2. Core Pillars of the Architecture
1. **Decentralized Multi-Model Driver**: Connects directly via client-side fetch or local Ollama instances. Zero middleman telemetry.
2. **Deterministic RAG Engine**: Utilizes hybrid TF-IDF and dense vector cosine similarity for in-memory document indexing, chunk splitting, and contextual citation mapping.
3. **Autonomous Agent Pipeline**: Orchestrates multi-step reasoning cycles: Query Decomposition -> Web Retrieval -> Code Execution Sandbox -> Dynamic Chart Visualization -> Executive Synthesis.
4. **Live Artifact Sandboxing**: Instantly compiles and renders interactive frontend web apps, SVG graphics, and live dashboards within an isolated sandbox.

## 3. Privacy & Local-First Philosophy
All conversation threads, indexed documents, and user-configured system prompts are saved directly in the browser's local encrypted storage. API keys never leave the client's device, ensuring compliance with strict data sovereignty standards.`
    },
    {
      id: 'doc-ai-trends-2026',
      title: 'Modern AI Frontiers & Reasoning Models 2026.txt',
      type: 'text',
      size: '12.8 KB',
      date: '2026-09-24',
      content: `Emerging Frontiers in Artificial Intelligence (2026 Briefing):

1. The Paradigm Shift to Test-Time Compute & Reinforcement Learning:
Models such as DeepSeek-R1 and Gemini 2.0 Flash Thinking have revolutionized inference by spending adaptive compute budget on "Thinking Process" reasoning paths before outputting final answers. This allows smaller models to achieve superhuman scores on mathematical proofs and competitive programming.

2. In-Browser Agentic Workflows:
With advances in WebAssembly and WebGPU, client-side agent loops can execute local sandboxed code, interact with DOM elements, and summarize gigabytes of unstructured context without transmitting proprietary IP across third-party networks.

3. Hybrid Retrieval:
Combining sparse keyword matching (BM25) with dense vector embeddings yields 35% higher recall on technical documentation than standalone vector search, preventing hallucinations in legal and financial domains.`
    },
    {
      id: 'doc-quantum-computing',
      title: 'Quantum Computing & Algorithms Primer.json',
      type: 'json',
      size: '9.2 KB',
      date: '2026-09-20',
      content: `{
  "topic": "Quantum Computing & Quantum Algorithms",
  "version": "2.4",
  "fundamental_concepts": {
    "qubit": "A two-level quantum system exhibiting superposition state |psi> = alpha|0> + beta|1>",
    "entanglement": "Non-local quantum correlations where multi-qubit state cannot be factored into individual states",
    "decoherence": "Loss of quantum information caused by environmental thermal fluctuations"
  },
  "key_algorithms": [
    {
      "name": "Shor's Algorithm",
      "speedup": "Exponential",
      "impact": "Polynomial-time integer factorization breaking classical RSA cryptography"
    },
    {
      "name": "Grover's Algorithm",
      "speedup": "Quadratic",
      "impact": "Unstructured database search in O(sqrt(N)) queries"
    },
    {
      "name": "VQE (Variational Quantum Eigensolver)",
      "speedup": "Heuristic",
      "impact": "Molecular simulation and quantum chemistry for drug discovery"
    }
  ]
}`
    }
  ],

  sampleWorkflows: [
    {
      id: 'market-intel',
      title: 'Competitor Intelligence & Growth Forecast',
      goal: 'Analyze market dynamics of AI Developer Tools in 2026, plot pricing models, and draft an executive strategic roadmap.',
      steps: ['Decompose Industry Drivers', 'Web Search Leading Startups', 'Compute Cost/Token Matrix', 'Generate Market Share Chart', 'Synthesize Executive Memo']
    },
    {
      id: 'fullstack-builder',
      title: 'Autonomous Web App Prototyper',
      goal: 'Design a responsive Crypto Portfolio Dashboard with real-time price tickers, interactive charts, and buy/sell modal.',
      steps: ['Generate Component Architecture', 'Write Glassmorphic CSS Engine', 'Develop State & WebSockets Mock', 'Compile Sandbox Artifact', 'Validate User Experience']
    }
  ]
};
