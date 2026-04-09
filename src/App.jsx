import { useState, useEffect } from 'react';

const PROFILE = {
  name: "Sahed Alom Sumit",
  bio: "5+ years working with founders, brands, and agencies worldwide. I turn rough ideas into polished digital products. Work sits at the intersection of design thinking and full-stack development — I care about the vibe of a page as much as how fast it loads. Background in Business IT (Haaga-Helia University, Helsinki) — I understand the business side, not just aesthetics.",
  stats: {
    sitesBuilt: "150+",
    experience: "5+ years",
    fiverrStatus: "Level 2",
    upworkJSS: "100%",
  },
  skills: {
    design: ["Responsive Design", "Accessibility", "Prototyping", "Wireframing", "User Research"],
    development: ["Webflow", "WordPress", "Figma", "React", "Node.js", "Tailwind CSS"],
    aiAutomation: ["Claude Code", "Make.com", "n8n", "Zapier"],
  },
  portfolioProjects: [
    { name: "TwinTwo", url: "https://www.twintwo.com/" },
    { name: "Altshare", url: "https://altshare.com" },
    { name: "Notifi", url: "https://getnotifi.com" },
    { name: "Ovulio Baby", url: "https://ovulio-baby.com" },
    { name: "Blue Water Wipes", url: "https://www.bluewaterwipes.com/" },
  ],
  voiceRules: [
    "No 'Dear Hiring Manager' opener — ever",
    "No buzzwords: no 'leverage', 'passionate about', 'synergy', 'dynamic', 'results-driven'",
    "Short, active sentences. Get to the point fast.",
    "First sentence must hook on something specific from the job post",
    "Always reference 1-2 portfolio URLs that match the client's industry or tech stack",
    "Platform-aware: Upwork letters are concise, direct, with a clear hook + CTA",
    "End with a clear, low-friction call to action",
    "Write like a real person, not a cover letter template",
    "No fluff. Every sentence must earn its place.",
  ],
};

const CONFIG = {
  API_KEY: import.meta.env.VITE_API_KEY || '',
  MODELS: ['gemini-3-pro-preview', 'gemini-2.5-flash-lite', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2-flash', 'gemini-2-flash-lite']
};

function App() {
  const [jobDesc, setJobDesc] = useState('');
  const [length, setLength] = useState('2000');
  const [tone, setTone] = useState('professional');
  const [extra, setExtra] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('sahed_cl_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const buildSystemPrompt = (selectedTone) => {
    const toneGuides = {
      friendly: "Approachable and warm. Like talking to a friend.",
      professional: "Clean, confident, and direct. Competent and focused.",
      formal: "Respectful and structured. No contractions.",
      casual: "Relaxed and short. Like a quick message.",
      polite: "Gracious and considerate of their time.",
      persuasive: "Value-led and convincing. Clear proof points.",
      informative: "Fact-focused. Skills and outcomes first.",
      empathetic: "Problem-first. Show you heard their pain points.",
      humorous: "Clever and lighthearted personality.",
      serious: "No-nonsense and results-oriented."
    };

    const toneNote = toneGuides[selectedTone] || toneGuides["professional"];

    return `You are writing a cover letter / proposal in the voice of Sahed Alom Sumit, a freelance web designer & developer based in Helsinki, Finland.

## TONE INSTRUCTION
${toneNote}

## WHO SAHED IS
${PROFILE.bio}

## STATS
- ${PROFILE.stats.sitesBuilt} sites, ${PROFILE.stats.experience}
- Upwork: ${PROFILE.stats.upworkJSS} JSS
- Fiverr: ${PROFILE.stats.fiverrStatus}

## SKILLS
Design: ${PROFILE.skills.design.join(", ")}
Dev: ${PROFILE.skills.development.join(", ")}
AI: ${PROFILE.skills.aiAutomation.join(", ")}

## PORTFOLIO
${PROFILE.portfolioProjects.map(p => `- ${p.name}: ${p.url}`).join("\n")}

## VOICE RULES
${PROFILE.voiceRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## WHAT TO DO
1. Hook on a specific detail from the job post in the first line.
2. Show you understand their problem.
3. Suggest 1-2 relevant portfolio links.
4. Clean CTA. No fluff. No subject line.`;
  };

  const generateLetter = async () => {
    if (!jobDesc.trim()) {
      setError("Paste the job description first.");
      return;
    }

    setError('');
    setIsLoading(true);
    setOutput('');

    const systemPrompt = buildSystemPrompt(tone);
    const userPrompt = `Job Post:\n${jobDesc}\n\n${extra ? `Context: ${extra}\n` : ""}Target length: ~${length} characters. Write the letter now:`;

    let lastError = null;

    // Try each model in sequence
    for (const modelName of CONFIG.MODELS) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${CONFIG.API_KEY}`;
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1500,
            }
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          const errorMessage = errData.error?.message || `Status ${response.status}`;
          
          // If it's a rate limit (429) or overload (503), try the next model
          if (response.status === 429 || response.status === 503 || response.status === 500) {
            console.warn(`Model ${modelName} failed (${response.status}). Trying next fallback...`);
            lastError = new Error(`Model ${modelName} failed: ${errorMessage}`);
            continue; 
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const letter = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!letter) throw new Error("Empty response from Gemini.");

        setOutput(letter);
        const newHistoryItem = {
          letter,
          tone,
          length,
          model: modelName,
          jobSnippet: jobDesc.slice(0, 100),
          timestamp: new Date().toISOString(),
        };
        
        const updatedHistory = [newHistoryItem, ...history].slice(0, 20);
        setHistory(updatedHistory);
        localStorage.setItem('sahed_cl_history', JSON.stringify(updatedHistory));
        
        setIsLoading(false);
        return; // Success! Exit the function

      } catch (err) {
        console.error(`Error with ${modelName}:`, err);
        lastError = err;
        // Continue to next model for any error that isn't handled above
        continue;
      }
    }

    // If we get here, all models failed
    setError(lastError?.message || "All AI models failed to respond. Please check your API key or connection.");
    setIsLoading(false);
  };

  const copyToClipboard = (text, e) => {
    navigator.clipboard.writeText(text).then(() => {
      const btn = e.target;
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = original, 1500);
    });
  };

  const deleteHistoryItem = (index, e) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem('sahed_cl_history', JSON.stringify(updated));
  };

  return (
    <div className="relative z-10 max-w-[860px] mx-auto px-6 py-12 pb-20">
      <header className="flex items-baseline gap-4 mb-12 border-b border-border pb-6">
        <h1 className="font-sans font-extrabold text-2xl tracking-tighter">
          Cover Letter<span className="text-accent">.</span>
        </h1>
        <span className="font-mono text-[10px] tracking-widest text-textMuted bg-surface2 border border-border px-2 py-0.5 rounded uppercase">
          AI Powered
        </span>
      </header>

      <div className="card">
        <div className="mb-5">
          <label className="label-text">Job Description <span className="text-accent">*</span></label>
          <textarea
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            rows="10"
            className="input-field resize-y leading-relaxed"
            placeholder="Paste the full job post here — title, description, client name, budget, anything you see..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="relative">
            <label className="label-text">Target Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="input-field appearance-none cursor-pointer pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23e8f55a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
            >
              <option value="1000">~1000 chars — Short & sharp</option>
              <option value="2000">~2000 chars — Standard</option>
              <option value="3000">~3000 chars — Detailed</option>
              <option value="4000">~4000 chars — Comprehensive</option>
              <option value="5000">~5000 chars — Full pitch</option>
            </select>
          </div>
          <div className="relative">
            <label className="label-text">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="input-field appearance-none cursor-pointer pr-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23e8f55a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
              }}
            >
              {['friendly', 'professional', 'formal', 'casual', 'polite', 'persuasive', 'informative', 'empathetic', 'humorous', 'serious'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <label className="label-text">Extra context <span className="text-textDim">(optional)</span></label>
          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            type="text"
            className="input-field"
            placeholder="e.g. mention React experience, focus on speed optimization..."
          />
        </div>

        <button 
          type="button"
          onClick={generateLetter}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Generating...' : 'Generate Cover Letter'}
        </button>

        {isLoading && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-accent/5 border border-accent/15 rounded-lg">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
            <span className="text-xs text-accent">Writing your cover letter...</span>
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs text-center">
            {error}
          </div>
        )}
      </div>

      {output && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-3">
            <span className="label-text mb-0">Generated Cover Letter</span>
            <div className="flex gap-2 items-center">
              <button 
                type="button"
                onClick={(e) => copyToClipboard(output, e)}
                className="btn-secondary"
              >
                Copy
              </button>
              <button 
                type="button"
                onClick={() => setOutput('')}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="bg-surface2 border border-border rounded-lg p-5 whitespace-pre-wrap leading-relaxed text-[13.5px] min-h-[120px]">
            {output}
          </div>
          <div className="text-[11px] text-textMuted text-right mt-1.5">
            <span className="text-accent">{output.length.toLocaleString()}</span> characters
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 my-11">
        <span className="font-sans font-semibold text-xs text-textMuted tracking-widest uppercase">History</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      <div className="flex flex-col gap-3">
        {history.length === 0 ? (
          <div className="text-center text-textDim text-sm py-8 border border-dashed border-border rounded-xl">
            No letters generated yet.
          </div>
        ) : (
          history.map((item, index) => (
            <div 
              key={index}
              onClick={() => setExpandedHistory(expandedHistory === index ? null : index)}
              className="bg-surface border border-border rounded-xl p-4 cursor-pointer transition-all hover:border-accent/30 group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase bg-surface2 border border-border px-2 py-0.5 rounded text-textMuted group-hover:text-accent transition-colors">{item.tone}</span>
                  <span className="text-[11px] text-textDim">
                    {new Date(item.timestamp).toLocaleString("en-FI", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="text-[10px] text-accent/50 group-hover:text-accent">{item.letter.length} chars</span>
              </div>
              <div className={`text-xs text-textMuted leading-relaxed ${expandedHistory === index ? 'hidden' : 'line-clamp-2'}`}>
                {item.letter.slice(0, 150).replace(/\n/g, " ")}...
              </div>
              {expandedHistory === index && (
                <div className="mt-4 pt-4 border-t border-border whitespace-pre-wrap text-[13px] leading-relaxed text-[#f0f0f2] animate-in fade-in duration-300">
                  {item.letter}
                  <div className="flex gap-2 mt-4">
                    <button 
                      type="button"
                      onClick={(e) => copyToClipboard(item.letter, e)}
                      className="btn-secondary"
                    >
                      Copy
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => deleteHistoryItem(index, e)}
                      className="btn-secondary"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
