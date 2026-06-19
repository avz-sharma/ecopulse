import React, { useState, useEffect } from 'react';
import { getRankBadge, REGIONAL_CARBON_FACTORS } from '../utils/logic';

export default function Scorecard({ 
  userNickname, 
  myCalculatedStats, 
  userRankData, 
  selectedReceipt, 
  myReceipts, 
  setKeySavedMessage,
  apiKeyValue
}) {
  
  // Pre-calculated stats for the currently inspected receipt in view
  const currentTotal = selectedReceipt?.total_co2e || 0;
  const currentRickshaw = Math.round(currentTotal / 0.12);
  const currentTrees = Math.round(currentTotal * 52 * 0.05);

  // 1. Setup states for the AI insight
  const [aiInsight, setAiInsight] = useState("");
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  // 2. Add the background fetcher
  useEffect(() => {
    const fetchEmotionalInsight = async () => {
      if (!selectedReceipt || !selectedReceipt.total_co2e) return;
      if (!apiKeyValue || !apiKeyValue.trim()) {
        setAiInsight(""); // Fallback to normal stats if no API key is provided
        return;
      }

      setIsGeneratingInsight(true);
      const prompt = `A user has generated a carbon footprint of ${selectedReceipt.total_co2e.toFixed(2)} kg CO2e from a recent grocery purchase. Generate a single, highly relatable, and slightly emotional sentence comparing this specific weight to an everyday activity (e.g., charging a smartphone for X years, running a microwave, driving a specific distance, melting Arctic ice). Keep it under 20 words. Make it punchy. Do not use formatting, just the sentence.`;
      
      const cleanKey = apiKeyValue.trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

      let delay = 1000;
      let success = false;
      let text = "";

      // Exponential backoff retry loop (1s, 2s, 4s, 8s, 16s)
      for (let i = 0; i < 5; i++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7 } // Slightly creative temperature
            })
          });

          if (response.ok) {
            const data = await response.json();
            text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            success = true;
            break;
          }
        } catch (err) {
          // Silent catch to prevent console clutter during retries
        }
        
        if (!success && i < 4) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
        }
      }

      if (success && text) {
        setAiInsight(text.trim());
      } else {
        setAiInsight(""); // Fallback to standard math if all 5 retries fail
      }
      setIsGeneratingInsight(false);
    };

    fetchEmotionalInsight();
  }, [selectedReceipt, apiKeyValue]);

  const categoryStats = React.useMemo(() => {
    const itemDistribution = {};
    Object.keys(REGIONAL_CARBON_FACTORS).forEach(cat => {
      itemDistribution[cat] = 0;
    });

    if (myReceipts.length === 0) {
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
      return results;
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
        val: itemDistribution[cat] || 0,
        pct: totalAll > 0 ? Math.round(((itemDistribution[cat] || 0) / totalAll) * 100) : 0
      };
    });
    return results;
  }, [myReceipts]);

  const generateShareCanvas = (callback) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");

    // 1. Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 500);
    grad.addColorStop(0, "#080c14");
    grad.addColorStop(0.5, "#0d1b15");
    grad.addColorStop(1, "#070A13");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 500);

    // Decorative glow circles
    ctx.fillStyle = "rgba(32, 193, 106, 0.05)";
    ctx.beginPath();
    ctx.arc(800, 0, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 500, 200, 0, Math.PI * 2);
    ctx.fill();

    // 2. Borders and Frames
    ctx.strokeStyle = "rgba(32, 193, 106, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 760, 460);

    ctx.strokeStyle = "rgba(32, 193, 106, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(25, 25, 750, 450);

    // 3. Header Text
    ctx.fillStyle = "#20C16A";
    ctx.font = "bold 14px monospace";
    ctx.fillText("ECOPULSE COLLECTIVE V2.0", 50, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "extrabold 28px sans-serif";
    ctx.fillText("CARBON FOOTPRINT SCORECARD", 50, 95);

    // Horizontal line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(750, 115);
    ctx.stroke();

    // 4. User Info Block
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("Profile Nickname", 50, 150);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(userNickname, 50, 180);

    // Rank Badge
    ctx.fillStyle = "rgba(32, 193, 106, 0.1)";
    ctx.fillRect(50, 205, 280, 50);
    ctx.strokeStyle = "rgba(32, 193, 106, 0.3)";
    ctx.strokeRect(50, 205, 280, 50);

    ctx.fillStyle = "#43D98A";
    ctx.font = "bold 16px sans-serif";
    const rnk = userRankData.rank;
    const rankTitle = getRankBadge(rnk, myCalculatedStats.scoreValue).split(" ").slice(1).join(" ") || "Carbon Consumer";
    ctx.fillText(`Rank: #${rnk} (${rankTitle})`, 65, 236);

    // 5. Scorecard Block (Middle Row)
    // Score box
    ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
    ctx.fillRect(50, 275, 130, 90);
    ctx.strokeRect(50, 275, 130, 90);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("GLOBAL SCORE", 65, 298);
    ctx.fillStyle = "#20C16A";
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${myCalculatedStats.scoreValue} Pts`, 65, 335);

    // Average weekly emissions box
    ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
    ctx.fillRect(200, 275, 130, 90);
    ctx.strokeRect(200, 275, 130, 90);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("WEEKLY AVG", 215, 298);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${myCalculatedStats.averageWeekly} kg`, 215, 335);

    // Grade box
    ctx.fillStyle = "rgba(30, 41, 59, 0.5)";
    ctx.fillRect(350, 275, 90, 90);
    ctx.strokeRect(350, 275, 90, 90);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("GRADE", 365, 298);
    ctx.fillStyle = "#43D98A";
    ctx.font = "extrabold 36px sans-serif";
    ctx.fillText(myCalculatedStats.grade, 365, 340);

    // 6. Last Receipt Outlay Block (Right Side)
    ctx.fillStyle = "rgba(32, 193, 106, 0.05)";
    ctx.fillRect(470, 150, 280, 215);
    ctx.strokeStyle = "rgba(32, 193, 106, 0.15)";
    ctx.strokeRect(470, 150, 280, 215);

    ctx.fillStyle = "#20C16A";
    ctx.font = "bold 12px monospace";
    ctx.fillText("ESTIMATED OUTLAY", 490, 180);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(selectedReceipt?.merchant || "No transactions yet", 490, 215);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("Footprint (CO2e):", 490, 255);

    ctx.fillStyle = "#43D98A";
    ctx.font = "bold 24px monospace";
    ctx.fillText(`${(selectedReceipt?.total_co2e || 0).toFixed(2)} kg`, 490, 290);

    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    const dateText = selectedReceipt?.timestamp?.seconds 
      ? new Date(selectedReceipt.timestamp.seconds * 1000).toLocaleString() 
      : "No Date";
    ctx.fillText(dateText, 490, 335);

    // 7. Footer
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.moveTo(50, 395);
    ctx.lineTo(750, 395);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "11px monospace";
    ctx.fillText("VERIFIED ENVIRONMENT LOG RECORD", 50, 425);
    ctx.fillText("ECOPULSE COLLECTIVE PROJECT", 50, 442);

    ctx.fillStyle = "#20C16A";
    ctx.font = "bold 14px monospace";
    ctx.fillText("https://ecopulse.collective", 520, 435);

    // AI Insight Emotional Tagline
    ctx.fillStyle = "#43D98A"; // primary-400
    ctx.font = "italic 12px sans-serif";
    const wrapText = aiInsight || "Track your footprint and shift your habits.";
    ctx.fillText(`${wrapText}`, 50, 470);

    callback(canvas);
  };

  const handleDownloadPNG = () => {
    generateShareCanvas((canvas) => {
      const link = document.createElement("a");
      link.download = `EcoPulse_Scorecard_${userNickname}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const handleShareWhatsApp = () => {
    generateShareCanvas((canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          try {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
              setKeySavedMessage("Card Copied! Paste on WhatsApp.");
              setTimeout(() => setKeySavedMessage(""), 3000);
            });
          } catch (e) {
            console.warn("Could not copy image to clipboard", e);
          }
        }
      });
    });

    const rnk = userRankData.rank;
    const rankTitle = getRankBadge(rnk, myCalculatedStats.scoreValue).split(" ").slice(1).join(" ") || "Carbon Consumer";
    const textMessage = `🌱 *EcoPulse Carbon Scorecard* 🌱
👤 *User:* ${userNickname}
🏆 *Global Rank:* #${rnk} (${rankTitle})
📊 *Score:* ${myCalculatedStats.scoreValue} Pts
📉 *Grade:* ${myCalculatedStats.grade} (Weekly Avg: ${myCalculatedStats.averageWeekly} kg)

🧾 *Last Receipt Outlay:*
🛒 *Merchant:* ${selectedReceipt?.merchant || "None"}
💨 *Footprint:* ${(selectedReceipt?.total_co2e || 0).toFixed(2)} kg CO2e

Track your carbon footprint instantly with EcoPulse!`;

    const encodedText = encodeURIComponent(textMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleSmartCart = () => {
    if (!selectedReceipt || !selectedReceipt.items) return;
    let swapList = "🛒 *My EcoPulse Smart Cart for Next Week* 🛒\n\n";
    selectedReceipt.items.forEach(item => {
      if (item.co2e_kg > 2.0) {
        swapList += `❌ Skip: ${item.raw_name}\n✅ Buy: Plant-based/Local alternative\n\n`;
      } else {
        swapList += `✅ ${item.raw_name}\n`;
      }
    });

    const fallbackCopy = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert("Green Swap Smart Cart copied! Paste this into your grocery search.");
      } catch (err) {
        console.error("Secure copy fell back unsuccessfully", err);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(swapList)
        .then(() => alert("Green Swap Smart Cart copied! Paste this into your grocery search."))
        .catch(() => fallbackCopy(swapList));
    } else {
      fallbackCopy(swapList);
    }
  };

  const getReceiptGrade = (co2e) => {
    let score = Math.max(15, Math.round(100 - (co2e - 5.0) * 8.5));
    if (score > 100) score = 100;
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 35) return "D";
    return "F";
  };

  const getReceiptPoints = (co2e) => {
    let score = Math.max(15, Math.round(100 - (co2e - 5.0) * 8.5));
    if (score > 100) score = 100;
    if (score >= 80) return 100;
    if (score >= 65) return 75;
    if (score >= 50) return 50;
    if (score >= 35) return 25;
    return 10;
  };

  const strokeDashOffsetVal = 100 - (myCalculatedStats.scoreValue || 50);

  return (
    <div id="scorecard-visual-capture" className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm overflow-hidden">

      {/* Pane 1: Outlay Description Card */}
      <div className="md:col-span-4 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block">Estimated Outlay</span>
            <span className="text-[10px] bg-surface-700 border border-border-soft text-primary-300 px-2.5 py-0.5 rounded-lg font-mono">
              {selectedReceipt?.merchant || "Base Grid"}
            </span>
          </div>

          <div className="flex items-baseline space-x-1.5">
            <span className="text-4xl font-extrabold text-text-100 tracking-tight font-mono">{currentTotal.toFixed(2)}</span>
            <span className="text-xs font-bold text-text-500">kg CO2e</span>
          </div>
        </div>

        {/* AI translation display or safe dynamic fallback */}
        <div className="border-t border-border-soft pt-3 min-h-[50px]">
          {isGeneratingInsight ? (
            <div className="space-y-1.5 animate-pulse">
              <div className="h-2 bg-white/5 rounded w-3/4"></div>
              <div className="h-2 bg-white/5 rounded w-1/2"></div>
            </div>
          ) : aiInsight ? (
            <div className="flex items-start space-x-1.5">
              <span className="text-xs text-amber-500 mt-0.5">✨</span>
              <div>
                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block mb-0.5">AI Impact Translation</span>
                <p className="text-[11px] text-text-300 font-medium italic">"{aiInsight}"</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-[10px] text-text-500">
              <div className="flex justify-between">
                <span>Equivalent Rickshaw</span>
                <span className="text-text-100 font-mono">{currentRickshaw} km</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-2 pt-1">
          <button type="button" onClick={handleDownloadPNG} className="flex-1 bg-surface-700 hover:bg-surface-800 text-text-100 text-[10px] font-bold py-2 rounded-lg transition border border-border-soft">
            Export Card
          </button>
          <button type="button" onClick={handleShareWhatsApp} className="flex-1 bg-primary-500 hover:bg-primary-400 text-text-100 text-[10px] font-bold py-2 rounded-lg transition">
            Share WhatsApp
          </button>
          <button 
            type="button" 
            onClick={handleSmartCart} 
            className="flex-1 bg-primary-500 hover:bg-primary-400 text-text-100 text-[10px] font-bold py-2 rounded-lg transition"
          >
            Export Smart Cart 🛒
          </button>
        </div>
      </div>

      {/* Pane 2: Satisfaction Semicircular compliance curve index */}
      <div className="md:col-span-4 bg-surface-700/40 border border-border-soft rounded-2xl p-4 flex flex-col items-center justify-center relative">
        <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold absolute top-4 left-4">
          Compliance Curve
        </span>

        <div className="relative flex items-center justify-center mt-4">
          <svg className="w-36 h-36 transform -rotate-90">
            <circle cx="72" cy="72" r="58" stroke="#0b1320" strokeWidth="10" fill="transparent" strokeDasharray="364" strokeDashoffset="182" strokeLinecap="round" className="origin-center rotate-45" />
            <circle cx="72" cy="72" r="58" stroke="#20C16A" strokeWidth="10" fill="transparent" strokeDasharray="364" strokeDashoffset={182 + (strokeDashOffsetVal * 1.82)} strokeLinecap="round" className="origin-center rotate-45 transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-extrabold text-text-100 font-mono">{myCalculatedStats.scoreValue}%</span>
            <p className="text-[8px] text-text-500 uppercase font-semibold">Climate Score</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-text-300 mt-3 block">Grade {myCalculatedStats.grade} benchmark</span>
      </div>

      {/* Pane 3: Prestigious Gold Badge */}
      <div className="md:col-span-4 bg-surface-700/40 border border-border-soft rounded-2xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block">Collective Rank</span>
            <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.2 rounded font-bold">PRESTIGE</span>
          </div>

          <div className="flex items-center space-x-3 my-2">
            <div className="w-16 h-16 bg-amber-500/5 rounded-full border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(242,177,52,0.05)] shrink-0">
              <span className="text-2xl font-extrabold text-amber-500 font-mono">#{userRankData.rank}</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-text-100 truncate">Standings: {userRankData.percentile}%</h4>
              <p className="text-[10px] text-text-500 leading-normal">Optimized stance compared to regional standards</p>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-text-500 border-t border-border-soft pt-2.5 font-mono">Roster elements dynamically synced.</p>
      </div>

    </div>
  );
}
