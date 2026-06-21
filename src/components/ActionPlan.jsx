import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function ActionPlan({ selectedReceipt, setActionPointsBonus, onQuestsCompleted, onQuestsUncompleted }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acceptedQuests, setAcceptedQuests] = useState({});
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [hasCompletedAll, setHasCompletedAll] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0);

  const formatCooldown = (ms) => {
    const totalSecs = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  useEffect(() => {
    const checkCooldown = () => {
      const cooldownEndStr = localStorage.getItem('ECOPULSE_QUESTS_COOLDOWN_END');
      if (cooldownEndStr) {
        const cooldownEnd = parseInt(cooldownEndStr, 10);
        const timeLeft = cooldownEnd - Date.now();
        if (timeLeft > 0) {
          setCooldownTimeLeft(timeLeft);
        } else {
          localStorage.removeItem('ECOPULSE_QUESTS_COOLDOWN_END');
          setCooldownTimeLeft(0);
        }
      } else {
        setCooldownTimeLeft(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setShowLevelUp(false);
    
    if (!selectedReceipt?.id) {
      setQuests([]);
      setAcceptedQuests({});
      setHasCompletedAll(false);
      if (setActionPointsBonus) setActionPointsBonus(0);
      if (onQuestsUncompleted) onQuestsUncompleted();
      return;
    }

    const saved = localStorage.getItem(`ECOPULSE_QUESTS_${selectedReceipt.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setQuests(parsed.quests || []);
        setAcceptedQuests(parsed.acceptedQuests || {});
        setHasCompletedAll(!!parsed.hasCompletedAll);
        
        if (parsed.hasCompletedAll) {
          if (setActionPointsBonus) setActionPointsBonus(30);
          if (onQuestsCompleted) onQuestsCompleted();
        } else {
          if (setActionPointsBonus) setActionPointsBonus(0);
          if (onQuestsUncompleted) onQuestsUncompleted();
        }
      } catch (err) {
        console.error("Error parsing stored quests:", err);
      }
    } else {
      setQuests([]);
      setAcceptedQuests({});
      setHasCompletedAll(false);
      if (setActionPointsBonus) setActionPointsBonus(0);
      if (onQuestsUncompleted) onQuestsUncompleted();
    }
  }, [selectedReceipt?.id]);

  const generateQuests = async () => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    setLoading(true);

    const prompt = `A user just uploaded a grocery receipt. The items with the highest carbon footprint were: ${[...selectedReceipt.items]
      .sort((a, b) => (b.co2e_kg || 0) - (a.co2e_kg || 0))
      .slice(0, 3)
      .map((item) => item.raw_name)
      .join(', ')}. 
Provide exactly 3 short, actionable, and encouraging steps (under 12 words each) the user can take next week to reduce their footprint. 
Format as a numbered list. No intro, no outro, just the 3 steps.`;

    try {
      const headers = { 
        'Content-Type': 'application/json'
      };
      const endpoint = `/api/gemini?model=gemini-2.5-flash`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 }
        })
      });

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
        if (selectedReceipt?.id) {
          localStorage.setItem(`ECOPULSE_QUESTS_${selectedReceipt.id}`, JSON.stringify({
            quests: results,
            acceptedQuests: {},
            hasCompletedAll: false
          }));
        }
      } else {
        throw new Error('Formatting failure');
      }
    } catch (err) {
      console.error(err);
      const failQuests = [
        'Monitor your highest carbon items next trip.',
        'Consider local alternatives for heavy footprint goods.',
        'Maintain current offset streak to build momentum.'
      ];
      setQuests(failQuests);
      if (selectedReceipt?.id) {
        localStorage.setItem(`ECOPULSE_QUESTS_${selectedReceipt.id}`, JSON.stringify({
          quests: failQuests,
          acceptedQuests: {},
          hasCompletedAll: false
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleQuest = (idx) => {
    const updated = { ...acceptedQuests, [idx]: !acceptedQuests[idx] };
    setAcceptedQuests(updated);

    const allAccepted = Object.values(updated).filter(Boolean).length === 3;
    
    if (selectedReceipt?.id) {
      localStorage.setItem(`ECOPULSE_QUESTS_${selectedReceipt.id}`, JSON.stringify({
        quests,
        acceptedQuests: updated,
        hasCompletedAll: allAccepted
      }));
    }

    if (allAccepted && !hasCompletedAll) {
      setShowLevelUp(true);
      setHasCompletedAll(true);
      if (onQuestsCompleted) onQuestsCompleted();
      if (setActionPointsBonus) setActionPointsBonus(30);

      const cooldownEnd = Date.now() + 2 * 60 * 60 * 1000;
      localStorage.setItem('ECOPULSE_QUESTS_COOLDOWN_END', cooldownEnd.toString());
      setCooldownTimeLeft(2 * 60 * 60 * 1000);
    } else if (!allAccepted) {
      setShowLevelUp(false);
      setHasCompletedAll(false);
      if (onQuestsUncompleted) onQuestsUncompleted();
      if (setActionPointsBonus) setActionPointsBonus(0);

      localStorage.removeItem('ECOPULSE_QUESTS_COOLDOWN_END');
      setCooldownTimeLeft(0);
    }
  };

  return (
    <div className="bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
      {showLevelUp && (
        <div className="absolute inset-0 bg-primary-500/95 backdrop-blur-sm z-50 flex items-center justify-center flex-col animate-in fade-in zoom-in duration-300">
          <h2 className="text-4xl font-black text-text-100 animate-bounce">LEVEL UP!</h2>
          <p className="text-xl font-bold text-text-100 mt-2 bg-black/20 px-4 py-2 rounded-full">+30 Action Points</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-extrabold text-text-100 uppercase tracking-wider">Weekly Carbon Quests</h2>
          <p className="text-[10px] text-text-500 font-medium">AI-Targeted footprint reduction plans</p>
        </div>
        <button
          type="button"
          onClick={generateQuests}
          disabled={loading || !selectedReceipt || (quests.length > 0 && !hasCompletedAll) || cooldownTimeLeft > 0}
          className="bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-text-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
        >
          {loading 
            ? 'Analyzing...' 
            : cooldownTimeLeft > 0 
              ? `Cooldown (${formatCooldown(cooldownTimeLeft)})` 
              : 'Generate Plan'
          }
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
              🎉 SQUAD LEVEL UP! +30 Points Added to Standings!
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

ActionPlan.propTypes = {
  selectedReceipt: PropTypes.object,
  setActionPointsBonus: PropTypes.func.isRequired,
  onQuestsCompleted: PropTypes.func.isRequired,
  onQuestsUncompleted: PropTypes.func.isRequired
};
