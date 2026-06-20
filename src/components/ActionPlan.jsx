import React, { useState, useEffect } from 'react';

export default function ActionPlan({ selectedReceipt, apiKeyValue, setActionPointsBonus, onQuestsCompleted, onQuestsUncompleted }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acceptedQuests, setAcceptedQuests] = useState({});
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [hasCompletedAll, setHasCompletedAll] = useState(false);

  useEffect(() => {
    setQuests([]);
    setAcceptedQuests({});
    setShowLevelUp(false);
    setHasCompletedAll(false);
    if (setActionPointsBonus) setActionPointsBonus(0);
    if (onQuestsUncompleted) onQuestsUncompleted();
  }, [selectedReceipt?.id, setActionPointsBonus, onQuestsUncompleted]);

  const generateQuests = async () => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    setLoading(true);

    if (!apiKeyValue || !apiKeyValue.trim()) {
      setTimeout(() => {
        setQuests([
          'Swap one dairy-heavy meal with a plant-based alternative.',
          'Opt for loose vegetables instead of plastic-wrapped packs.',
          "Plan next week's meals to minimize food waste."
        ]);
        setLoading(false);
      }, 1200);
      return;
    }

    const prompt = `A user just uploaded a grocery receipt. The items with the highest carbon footprint were: ${[...selectedReceipt.items]
      .sort((a, b) => (b.co2e_kg || 0) - (a.co2e_kg || 0))
      .slice(0, 3)
      .map((item) => item.raw_name)
      .join(', ')}. 
Provide exactly 3 short, actionable, and encouraging steps (under 12 words each) the user can take next week to reduce their footprint. 
Format as a numbered list. No intro, no outro, just the 3 steps.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKeyValue.trim()
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 }
          })
        }
      );

      if (!response.ok) throw new Error('API Response Error');

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const results = text
        .split('\n')
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line) => line.length > 5)
        .slice(0, 3);

      if (results.length === 3) {
        setQuests(results);
      } else {
        throw new Error('Formatting failure');
      }
    } catch (err) {
      console.error(err);
      setQuests([
        'Monitor your highest carbon items next trip.',
        'Consider local alternatives for heavy footprint goods.',
        'Maintain current offset streak to build momentum.'
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuest = (idx) => {
    const updated = { ...acceptedQuests, [idx]: !acceptedQuests[idx] };
    setAcceptedQuests(updated);

    const allAccepted = Object.values(updated).filter(Boolean).length === 3;
    if (allAccepted && !hasCompletedAll) {
      setShowLevelUp(true);
      setHasCompletedAll(true);
      if (onQuestsCompleted) onQuestsCompleted();
      if (setActionPointsBonus) setActionPointsBonus(50);
    } else if (!allAccepted) {
      setShowLevelUp(false);
      setHasCompletedAll(false);
      if (onQuestsUncompleted) onQuestsUncompleted();
      if (setActionPointsBonus) setActionPointsBonus(0);
    }
  };

  return (
    <div className="bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
      {showLevelUp && (
        <div className="absolute inset-0 bg-primary-500/95 backdrop-blur-sm z-50 flex items-center justify-center flex-col animate-in fade-in zoom-in duration-300">
          <h2 className="text-4xl font-black text-text-100 animate-bounce">LEVEL UP!</h2>
          <p className="text-xl font-bold text-text-100 mt-2 bg-black/20 px-4 py-2 rounded-full">+50 Action Points</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-extrabold text-text-100 uppercase tracking-wider">Weekly Carbon Quests</h3>
          <p className="text-[10px] text-text-500 font-medium">AI-Targeted footprint reduction plans</p>
        </div>
        <button
          type="button"
          onClick={generateQuests}
          disabled={loading || !selectedReceipt}
          className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-text-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
        >
          {loading ? 'Analyzing...' : 'Generate Plan'}
        </button>
      </div>

      {!selectedReceipt ? (
        <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-surface-700/20 min-h-[120px]">
          <span className="text-xs text-text-500 font-medium">Select a transaction log to activate.</span>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-3 min-h-[120px]">
          <div className="w-5 h-5 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] text-primary-300 animate-pulse font-mono font-bold">Synthesizing behavioral shifts...</span>
        </div>
      ) : quests.length > 0 ? (
        <div className="space-y-2 flex-1">
          {quests.map((quest, idx) => (
            <div
              key={idx}
              onClick={() => toggleQuest(idx)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-start space-x-3 ${
                acceptedQuests[idx]
                  ? 'bg-primary-500/10 border-primary-500/30'
                  : 'bg-surface-700 border-border-soft hover:border-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                  acceptedQuests[idx]
                    ? 'bg-primary-500 border-primary-500 text-text-100'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {acceptedQuests[idx] && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className={`text-[11px] font-medium leading-tight ${acceptedQuests[idx] ? 'text-text-100' : 'text-text-300'}`}>
                {quest}
              </p>
            </div>
          ))}
          {hasCompletedAll && (
            <div className="mt-3 bg-amber-500/20 border border-amber-500 text-center text-xs text-amber-500 font-extrabold py-2 rounded-xl animate-pulse">
              🎉 SQUAD LEVEL UP! +50 Points Added to Standings!
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-surface-700/20 min-h-[120px]">
          <span className="text-xs text-text-500 font-medium">Hit generate to receive AI mitigation quests.</span>
        </div>
      )}
    </div>
  );
}
