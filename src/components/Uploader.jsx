import React, { useState } from 'react';

// Ready-to-go quick-commerce mock datasets for immediate visual demonstrations
export const PRESETS = {
  blinkit_01: {
    merchant: "Blinkit",
    rawText: `BLINKIT ORDER #BK-90231\n1x Amul Butter 500g - ₹275\n2x Country Delight Milk 1L - ₹144\n1x India Gate Basmati Rice - ₹110\n1x Local Aloo 2kg - ₹60\n1x Coca Cola 1.25L - ₹75`,
    items: [
      {
        raw_name: "Amul Butter 500g", category: "Dairy", quantity: 1, pack_size: "500 g", factor: 11.5, co2e_kg: 5.75, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Amul Butter 500g", quantity: 1, pack_size: "500 g" },
        normalized: { product_name: "Amul Butter 500g", category: "Dairy", unit_weight_kg: 0.5, total_weight_kg: 0.5, is_mass_based: true },
        emission: { factor: 11.5, co2e_kg: 5.75, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Country Delight Milk 1L", category: "Dairy", quantity: 2, pack_size: "1 L", factor: 1.4, co2e_kg: 2.8, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Country Delight Milk 1L", quantity: 2, pack_size: "1 L" },
        normalized: { product_name: "Country Delight Milk 1L", category: "Dairy", unit_weight_kg: 1.0, total_weight_kg: 2.0, is_mass_based: true },
        emission: { factor: 1.4, co2e_kg: 2.8, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "India Gate Basmati Rice", category: "Rice & Grains", quantity: 1, pack_size: "1 kg", factor: 2.7, co2e_kg: 2.7, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "India Gate Basmati Rice", quantity: 1, pack_size: "1 kg" },
        normalized: { product_name: "India Gate Basmati Rice", category: "Rice & Grains", unit_weight_kg: 1.0, total_weight_kg: 1.0, is_mass_based: true },
        emission: { factor: 2.7, co2e_kg: 2.7, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Local Aloo 2kg", category: "Vegetables", quantity: 1, pack_size: "2 kg", factor: 0.5, co2e_kg: 1.0, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Local Aloo 2kg", quantity: 1, pack_size: "2 kg" },
        normalized: { product_name: "Local Aloo 2kg", category: "Vegetables", unit_weight_kg: 2.0, total_weight_kg: 2.0, is_mass_based: true },
        emission: { factor: 0.5, co2e_kg: 1.0, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Coca Cola 1.25L", category: "Beverages", quantity: 1, pack_size: "1.25 L", factor: 0.5, co2e_kg: 0.625, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Coca Cola 1.25L", quantity: 1, pack_size: "1.25 L" },
        normalized: { product_name: "Coca Cola 1.25L", category: "Beverages", unit_weight_kg: 1.25, total_weight_kg: 1.25, is_mass_based: true },
        emission: { factor: 0.5, co2e_kg: 0.625, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      }
    ]
  },
  zepto_01: {
    merchant: "Zepto",
    rawText: `ZEPTO INSTANT #ZP-88411\n1x Fresh Paneer 200g - ₹120\n3x Organic Bananas 1 Dozen - ₹180\n2x Coca Cola 1.25L - ₹150\n1x Raw Chicken Breast 500g - ₹240`,
    items: [
      {
        raw_name: "Fresh Paneer 200g", category: "Dairy", quantity: 1, pack_size: "200 g", factor: 6.0, co2e_kg: 1.2, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Fresh Paneer 200g", quantity: 1, pack_size: "200 g" },
        normalized: { product_name: "Fresh Paneer 200g", category: "Dairy", unit_weight_kg: 0.2, total_weight_kg: 0.2, is_mass_based: true },
        emission: { factor: 6.0, co2e_kg: 1.2, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Organic Bananas 1 Dozen", category: "Fruits", quantity: 3, pack_size: "1 kg", factor: 0.7, co2e_kg: 2.1, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Organic Bananas 1 Dozen", quantity: 3, pack_size: "1 kg" },
        normalized: { product_name: "Organic Bananas 1 Dozen", category: "Fruits", unit_weight_kg: 1.0, total_weight_kg: 3.0, is_mass_based: true },
        emission: { factor: 0.7, co2e_kg: 2.1, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Coca Cola 1.25L", category: "Beverages", quantity: 2, pack_size: "1.25 L", factor: 0.5, co2e_kg: 1.25, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Coca Cola 1.25L", quantity: 2, pack_size: "1.25 L" },
        normalized: { product_name: "Coca Cola 1.25L", category: "Beverages", unit_weight_kg: 1.25, total_weight_kg: 2.5, is_mass_based: true },
        emission: { factor: 0.5, co2e_kg: 1.25, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Raw Chicken Breast 500g", category: "Poultry", quantity: 1, pack_size: "500 g", factor: 4.5, co2e_kg: 2.25, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Raw Chicken Breast 500g", quantity: 1, pack_size: "500 g" },
        normalized: { product_name: "Raw Chicken Breast 500g", category: "Poultry", unit_weight_kg: 0.5, total_weight_kg: 0.5, is_mass_based: true },
        emission: { factor: 4.5, co2e_kg: 2.25, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      }
    ]
  },
  swiggy_01: {
    merchant: "Swiggy Instamart",
    rawText: `INSTAMART BILL #IM-55212\n1x Oat Milk 1L - ₹290\n1x Basmati Rice Premium 5kg - ₹650\n2x Tomato Local 1kg - ₹80`,
    items: [
      {
        raw_name: "Oat Milk 1L", category: "Plant Milks", quantity: 1, pack_size: "1 L", factor: 1.0, co2e_kg: 1.0, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Oat Milk 1L", quantity: 1, pack_size: "1 L" },
        normalized: { product_name: "Oat Milk 1L", category: "Plant Milks", unit_weight_kg: 1.0, total_weight_kg: 1.0, is_mass_based: true },
        emission: { factor: 1.0, co2e_kg: 1.0, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Basmati Rice Premium 5kg", category: "Rice & Grains", quantity: 1, pack_size: "5 kg", factor: 2.7, co2e_kg: 13.5, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Basmati Rice Premium 5kg", quantity: 1, pack_size: "5 kg" },
        normalized: { product_name: "Basmati Rice Premium 5kg", category: "Rice & Grains", unit_weight_kg: 5.0, total_weight_kg: 5.0, is_mass_based: true },
        emission: { factor: 2.7, co2e_kg: 13.5, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      },
      {
        raw_name: "Tomato Local 1kg", category: "Vegetables", quantity: 2, pack_size: "1 kg", factor: 0.5, co2e_kg: 1.0, status: "mapped",
        matching: { confidence: 0.97, match_type: "exact" },
        uncertainty: { level: "low" },
        raw: { raw_name: "Tomato Local 1kg", quantity: 2, pack_size: "1 kg" },
        normalized: { product_name: "Tomato Local 1kg", category: "Vegetables", unit_weight_kg: 1.0, total_weight_kg: 2.0, is_mass_based: true },
        emission: { factor: 0.5, co2e_kg: 1.0, status: "mapped", matching: { confidence: 0.97, match_type: "exact" }, uncertainty: { level: "low" } }
      }
    ]
  }
};

export default function Uploader({ executeCarbonPipeline, isProcessing, errorMessage }) {
  const [pastingText, setPastingText] = useState(false);
  const [inputText, setInputText] = useState("");

  const handleExecute = (text, preset) => {
    executeCarbonPipeline(text, preset);
    if (preset) {
      // Clear input text if we used a preset
      setInputText("");
    }
  };

  return (
    <div className="bg-surface-800 border border-border-soft rounded-[18px] shadow-sm p-6 relative">
      

      <h2 className="text-lg font-bold text-text-100 mb-2">Receipt Upload Suite</h2>
      <p className="text-sm text-text-500 mb-6">Upload Quick-Commerce billing formats to register points on the public standings map.</p>

      {/* Demo Mode Toggle vs Paste mode */}
      <div className="flex space-x-3 mb-4">
        <button
          type="button"
          onClick={() => setPastingText(false)}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${!pastingText ? 'bg-[#182030] text-primary-400 border border-primary-500/30' : 'bg-[#121824] text-text-500 border border-transparent hover:bg-[#161d2b]'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Instant Upload Demo
        </button>
        <button
          type="button"
          onClick={() => setPastingText(true)}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${pastingText ? 'bg-[#182030] text-primary-400 border border-primary-500/30' : 'bg-[#121824] text-text-500 border border-transparent hover:bg-[#161d2b]'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Paste Invoice Text
        </button>
      </div>

      {!pastingText ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => handleExecute("", PRESETS.zepto_01)}
            className="w-full border border-border-soft hover:border-primary-500/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-[#101624]/60 group text-center"
            aria-label="Trigger standard quick upload demo"
          >
            {isProcessing ? (
              <div className="flex flex-col items-center py-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mb-3"></div>
                <span className="text-xs text-primary-400 font-mono animate-pulse">Running OCR Extract Agents...</span>
              </div>
            ) : (
              <div>
                <span className="text-3xl mb-2 inline-block">📸</span>
                <p className="text-xs font-medium text-text-300">Trigger standard quick upload</p>
                <p className="text-[10px] text-text-500 mt-1">Loads prewritten cache parameters automatically</p>
              </div>
            )}
          </button>

          {/* Visual selector buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleExecute("", PRESETS.blinkit_01)}
              className="bg-[#121824] hover:bg-[#182030] border border-border-soft hover:border-primary-500/20 text-[10px] py-2 rounded-lg font-mono transition text-text-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              Blinkit Upload
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleExecute("", PRESETS.zepto_01)}
              className="bg-[#121824] hover:bg-[#182030] border border-border-soft hover:border-primary-500/20 text-[10px] py-2 rounded-lg font-mono transition text-text-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              Zepto Upload
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleExecute("", PRESETS.swiggy_01)}
              className="bg-[#121824] hover:bg-[#182030] border border-border-soft hover:border-primary-500/20 text-[10px] py-2 rounded-lg font-mono transition text-text-300 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
              Instamart Upload
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            rows={5}
            placeholder="Paste Swiggy, Zepto or Blinkit receipt invoice details..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-[#101624] border border-border-soft rounded-xl p-3 text-sm focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500 outline-none text-text-300 placeholder:text-text-500/60 transition resize-none"
          />
          <button
            type="button"
            onClick={() => handleExecute(inputText, null)}
            disabled={isProcessing}
            className="w-full bg-primary-500 hover:bg-primary-400 text-bg-950 shadow-sm font-bold py-3 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2 focus:ring-2 focus:ring-primary-500 focus:outline-none focus:ring-offset-2 focus:ring-offset-bg-850"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-bg-950 border-t-transparent rounded-full animate-spin"></div>
                Processing with LLM...
              </>
            ) : (
              "Submit to Gemini Pipeline"
            )}
          </button>
          <p className="text-[10px] text-text-500 mt-2 text-center font-mono">
            Note: The live Gemini AI extraction pipeline may take a few seconds to process the invoice.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}
