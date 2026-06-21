import React, { useMemo } from 'react';
import { REGIONAL_CARBON_FACTORS } from '../utils/logic';

// Curated harmonious colors for category progress bars matching the premium dark theme
const CATEGORY_COLORS = {
  "Dairy": "bg-amber-500",             // Orange/Yellow
  "Plant Milks": "bg-indigo-400",       // Blue/Purple
  "Rice & Grains": "bg-amber-600",     // Dark Orange
  "Legumes & Pulses": "bg-emerald-600", // Dark Green
  "Vegetables": "bg-emerald-500",      // Light Green
  "Fruits": "bg-teal-400",             // Teal/Cyan
  "Meat": "bg-red-500",                // Red
  "Poultry": "bg-rose-500",            // Pinkish Red
  "Eggs": "bg-yellow-500",             // Yellow
  "Seafood": "bg-cyan-500",            // Sky Blue
  "Cooking Oils": "bg-lime-500",        // Lime Green
  "Beverages": "bg-purple-500",        // Deep Purple
  "Packaged Snacks": "bg-pink-500",    // Magenta/Pink
  "Bakery & Cereals": "bg-amber-400",  // Light Yellow/Gold
  "Condiments & Sweeteners": "bg-slate-500", // Gray
  "Frozen Foods": "bg-blue-400",       // Ice Blue
  "Personal Care": "bg-sky-400",       // Pale Blue
  "Household Cleaning": "bg-zinc-400",  // Cool Gray
  "Other": "bg-slate-600"              // Slate Gray
};

export default function Categories({ myReceipts }) {
  const { categoryStats, totalAll } = useMemo(() => {
    const itemDistribution = {};
    Object.keys(REGIONAL_CARBON_FACTORS).forEach(cat => {
      itemDistribution[cat] = 0;
    });
    // If no receipts are present, use the exact sample values matching the mockup
    if (!myReceipts || myReceipts.length === 0) {
      const samples = { 
        "Dairy": 5.0, 
        "Rice & Grains": 2.7, 
        "Vegetables": 1.0, 
        "Fruits": 0.7, 
        "Beverages": 1.25, 
        "Packaged Snacks": 1.5,
        "Poultry": 2.25,
        "Plant Milks": 1.0
      };
      const total = Object.values(samples).reduce((a, b) => a + b, 0);
      const results = {};
      Object.keys(REGIONAL_CARBON_FACTORS).forEach(cat => {
        results[cat] = {
          val: samples[cat] || 0,
          pct: total > 0 ? Math.round(((samples[cat] || 0) / total) * 100) : 0
        };
      });
      return { categoryStats: results, totalAll: total };
    }

    let totalAll = 0;
    myReceipts.forEach(rec => {
      (rec.items || []).forEach(item => {
        let cat = item.category || "Other";
        if (cat === "Rice/Grains") cat = "Rice & Grains";
        if (cat === "Vegetables & Fruits") cat = "Vegetables";
        if (cat === "Meat & Poultry") cat = "Poultry";

        if (itemDistribution[cat] === undefined) {
          cat = "Other";
        }
        const val = item.co2e_kg || 0;
        itemDistribution[cat] += val;
        totalAll += val;
      });
    });

    const results = {};
    Object.keys(REGIONAL_CARBON_FACTORS).forEach(cat => {
      results[cat] = {
        val: parseFloat(itemDistribution[cat].toFixed(2)),
        pct: totalAll > 0 ? Math.round(((itemDistribution[cat] || 0) / totalAll) * 100) : 0
      };
    });
    return { categoryStats: results, totalAll };
  }, [myReceipts]);

  // Sort categories by percentage descending, or just render them in default list order as shown in image
  const categoriesList = Object.keys(REGIONAL_CARBON_FACTORS);

  return (
    <div className="bg-surface-800 border border-border-soft rounded-[18px] shadow-sm p-6 max-w-4xl mx-auto">
      <h2 className="text-xs font-bold text-text-500 uppercase tracking-wider mb-2">
        Historical Category Distributions
      </h2>

      {/* Debug Info in UI */}
      <div className="mb-6 text-[10px] font-mono text-text-500 bg-[#121824] p-3 rounded-lg border border-border-soft">
        Debug Info: {myReceipts ? myReceipts.length : 0} receipts loaded. Total emissions summed: {totalAll.toFixed(2)} kg CO2e.
      </div>

      <div className="space-y-4">
        {categoriesList.map(cat => {
          const stats = categoryStats[cat] || { val: 0, pct: 0 };
          const colorClass = CATEGORY_COLORS[cat] || "bg-slate-600";
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-300">{cat}</span>
                <span className="font-mono text-text-500">
                  <span className="text-text-300 font-bold">{stats.val.toFixed(2)} kg</span>
                  <span className="ml-1.5">({stats.pct}%)</span>
                </span>
              </div>
              
              {/* Progress Bar Track */}
              <div className="w-full bg-bg-900/50 rounded-full h-1.5 overflow-hidden">
                {/* Progress Bar Fill */}
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
                  style={{ width: `${stats.pct}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
