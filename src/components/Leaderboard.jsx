import React from 'react';
import { getRankBadge } from '../utils/logic';

export default function Leaderboard({ globalLeaderboard, activeUserId, squadCode = "GLOBAL", setSquadCode = () => {} }) {
  return (
    <div className="bg-surface-800 border border-border-soft rounded-[18px] shadow-sm p-6">
      <h3 className="text-xs font-bold text-text-500 uppercase tracking-wider mb-4">Indian Subcontinent Standings Map</h3>

      <div className="mb-4">
        <label htmlFor="squad-input" className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block mb-1.5">
          Join College / Family Squad
        </label>
        <input
          id="squad-input"
          type="text"
          value={squadCode}
          onChange={(e) => setSquadCode(e.target.value.toUpperCase())}
          placeholder="Enter room code (e.g. DU-CAMPUS, SQUAD7)"
          className="w-full bg-surface-700 border border-border-soft text-xs text-text-100 rounded-xl px-3 py-2 outline-none uppercase focus:ring-1 focus:ring-primary-400 transition"
        />
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {globalLeaderboard.length === 0 ? (
          <div className="py-8 text-center text-text-500 text-xs border border-dashed border-border-soft rounded-xl">
            Collective Board is currently empty. Complete your profile sync to initiate.
          </div>
        ) : (
          globalLeaderboard.map((item, index) => {
            const isMe = item.userId === activeUserId;
            return (
              <div
                key={item.userId}
                className={`flex items-center justify-between p-3 rounded-xl transition ${isMe ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-700 border-border-soft'}`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-xs font-bold font-mono ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-text-300' : index === 2 ? 'text-amber-500' : 'text-text-500'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-text-100 block">
                      {item.displayName || "Anonymous Hacker"}{' '}
                      {isMe && (
                        <span className="text-[9px] bg-primary-500/10 text-primary-400 border border-primary-500/20 px-1.5 py-0.2 rounded font-normal ml-1">
                          You
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-text-500">{getRankBadge(index + 1, item.scoreValue)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-500 font-mono">{item.scoreValue} Pts</span>
                  <p className="text-[9px] text-text-500">{item.averageEmissions || 0} kg/wk</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 bg-primary-500/10 rounded-xl p-3 text-center shrink-0">
        <h4 className="text-[10px] text-primary-300 font-bold uppercase tracking-widest font-sans">The Ripple Effect</h4>
        <p className="text-xs text-text-300 mt-1">
          If all <span className="font-bold text-amber-500">{globalLeaderboard.length} members</span> in squad adopted your active footprint,
          we would prevent <span className="font-bold text-amber-500">{(globalLeaderboard.length * 2.4).toFixed(1)} kg CO2e</span> this week.
        </p>
      </div>
    </div>
  );
}
