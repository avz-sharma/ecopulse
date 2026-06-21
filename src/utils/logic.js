// Pure functions and constants for Ecopulse math engine (No React/Firebase imports)

export const EXACT_PRODUCTS = {
  "Amul Butter 500g": { factor: 11.5, category: "Dairy", status: "mapped" },
  "Country Delight Milk 1L": { factor: 1.4, category: "Dairy", status: "mapped" },
  "India Gate Basmati Rice": { factor: 2.7, category: "Rice & Grains", status: "mapped" },
  "Local Aloo 2kg": { factor: 0.5, category: "Vegetables", status: "mapped" },
  "Coca Cola 1.25L": { factor: 0.5, category: "Beverages", status: "mapped" },
  "Fresh Paneer 200g": { factor: 6.0, category: "Dairy", status: "mapped" },
  "Organic Bananas 1 Dozen": { factor: 0.7, category: "Fruits", status: "mapped" },
  "Raw Chicken Breast 500g": { factor: 4.5, category: "Poultry", status: "mapped" },
  "Oat Milk 1L": { factor: 1.0, category: "Plant Milks", status: "mapped" },
  "Basmati Rice Premium 5kg": { factor: 2.7, category: "Rice & Grains", status: "mapped" },
  "Tomato Local 1kg": { factor: 0.5, category: "Vegetables", status: "mapped" }
};

export const PRODUCT_TYPES = [
  { keywords: ["vegetable", "aloo", "potato", "spinach", "onion", "pyaaz", "tomato", "sabzi", "green"], factor: 0.5, category: "Vegetables" },
  { keywords: ["fruit", "banana", "apple", "orange", "mango", "grape", "berry", "blueberry", "avocado", "watermelon"], factor: 0.7, category: "Fruits" },
  { keywords: ["wheat", "atta", "flour", "roti", "bread", "oats", "grain"], factor: 1.5, category: "Bakery & Cereals" },
  { keywords: ["rice", "basmati", "paddy"], factor: 2.7, category: "Rice & Grains" },
  { keywords: ["pulse", "dal", "lentil", "gram", "legume", "chana", "rajma"], factor: 0.9, category: "Legumes & Pulses" },
  { keywords: ["plant milk", "almond milk", "oat milk", "soy milk"], factor: 1.0, category: "Plant Milks" },
  { keywords: ["milk"], factor: 1.4, category: "Dairy" },
  { keywords: ["yogurt", "curd", "dahi"], factor: 2.0, category: "Dairy" },
  { keywords: ["paneer"], factor: 6.0, category: "Dairy" },
  { keywords: ["cheese"], factor: 9.0, category: "Dairy" },
  { keywords: ["butter", "ghee"], factor: 11.5, category: "Dairy" },
  { keywords: ["egg"], factor: 3.5, category: "Eggs" },
  { keywords: ["chicken", "poultry"], factor: 4.5, category: "Poultry" },
  { keywords: ["pork"], factor: 6.0, category: "Meat" },
  { keywords: ["fish", "seafood", "prawn", "crab", "shrimp"], factor: 5.0, category: "Seafood" },
  { keywords: ["beef"], factor: 30.0, category: "Meat" },
  { keywords: ["oil", "mustard oil", "olive oil", "sunflower oil"], factor: 3.5, category: "Cooking Oils" },
  { keywords: ["sugar", "sweetener", "honey"], factor: 2.0, category: "Condiments & Sweeteners" },
  { keywords: ["soft drink", "coke", "pepsi", "soda", "sprite", "fanta", "limca", "beverage", "drink", "juice"], factor: 0.8, category: "Beverages" },
  { keywords: ["tea", "chai"], factor: 5.0, category: "Beverages" },
  { keywords: ["coffee", "espresso"], factor: 22.5, category: "Beverages" },
  { keywords: ["cookie", "biscuit"], factor: 2.5, category: "Packaged Snacks" },
  { keywords: ["chip", "snack", "kurkure", "lays", "namkeen", "popcorn"], factor: 2.5, category: "Packaged Snacks" },
  { keywords: ["toilet paper", "toilet", "tissue", "paper", "clean", "detergent", "soap", "dishwash", "household"], factor: 2.0, category: "Household Cleaning" },
  { keywords: ["shampoo", "toothpaste", "face wash", "personal care"], factor: 2.0, category: "Personal Care" }
];

export const REGIONAL_CARBON_FACTORS = {
  "Dairy": { factor: 5.98, unit: "kg CO2e per kg/L", note: "Milk, yogurt, cheese, butter avg" },
  "Plant Milks": { factor: 1.0, unit: "kg CO2e per kg/L", note: "Plant-based milk alternatives" },
  "Rice & Grains": { factor: 2.1, unit: "kg CO2e per kg", note: "Rice and grains average" },
  "Legumes & Pulses": { factor: 0.9, unit: "kg CO2e per kg", note: "Dal, pulses, and legumes" },
  "Vegetables": { factor: 0.5, unit: "kg CO2e per kg", note: "Fresh regional vegetables" },
  "Fruits": { factor: 0.7, unit: "kg CO2e per kg", note: "Fresh seasonal fruits" },
  "Meat": { factor: 18.0, unit: "kg CO2e per kg", note: "Pork, beef, and other meats" },
  "Poultry": { factor: 4.5, unit: "kg CO2e per kg", note: "Chicken and poultry products" },
  "Eggs": { factor: 3.5, unit: "kg CO2e per kg", note: "Fresh eggs" },
  "Seafood": { factor: 5.0, unit: "kg CO2e per kg", note: "Fish and seafood" },
  "Cooking Oils": { factor: 3.5, unit: "kg CO2e per kg", note: "Vegetable and cooking oils" },
  "Beverages": { factor: 13.75, unit: "kg CO2e per kg/L", note: "Tea and coffee averages" },
  "Packaged Snacks": { factor: 2.5, unit: "kg CO2e per kg", note: "Cookies, biscuits, chips, snacks" },
  "Bakery & Cereals": { factor: 2.0, unit: "kg CO2e per kg", note: "Breads and bakery items" },
  "Condiments & Sweeteners": { factor: 2.0, unit: "kg CO2e per kg", note: "Sugar, honey, sweeteners" },
  "Frozen Foods": { factor: 2.0, unit: "kg CO2e per kg", note: "Frozen processed items" },
  "Personal Care": { factor: 2.0, unit: "kg CO2e per kg", note: "Soaps, shampoos, cosmetics" },
  "Household Cleaning": { factor: 2.0, unit: "kg CO2e per kg", note: "Detergents, cleaning products" },
  "Other": { factor: 2.0, unit: "kg CO2e per kg", note: "Generic fallback penalty factor" }
};

/**
 * Resolves the emissions factor, category, mapping status, confidence level, and uncertainty level for a product.
 * Uses exact product matching, product type matching (keywords), and category fallback logic.
 * @param {string} rawName - The raw name of the scanned receipt item.
 * @param {string} [category] - Optional category hint.
 * @returns {Object} An object containing the emission factor, category, status, matching, and uncertainty.
 */
export const resolveEmissionsFactor = (rawName, category) => {
  const nameLower = rawName.toLowerCase();
  
  // Level 1: Exact match
  const exactMatchKey = Object.keys(EXACT_PRODUCTS).find(
    key => key.toLowerCase() === nameLower
  );
  if (exactMatchKey) {
    return {
      factor: EXACT_PRODUCTS[exactMatchKey].factor,
      category: EXACT_PRODUCTS[exactMatchKey].category,
      status: "mapped",
      matching: {
        confidence: 0.97,
        match_type: "exact"
      },
      uncertainty: {
        level: "low"
      }
    };
  }
  
  // Level 2: Product type match
  const matchedType = PRODUCT_TYPES.find(type =>
    type.keywords.some(kw => {
      if (kw === "oil") {
        return /\boil\b/i.test(nameLower);
      }
      return nameLower.includes(kw);
    })
  );
  if (matchedType) {
    return {
      factor: matchedType.factor,
      category: matchedType.category,
      status: "mapped",
      matching: {
        confidence: 0.85,
        match_type: "keyword"
      },
      uncertainty: {
        level: "low-medium"
      }
    };
  }
  
  // Level 3: Category average
  if (category && REGIONAL_CARBON_FACTORS[category] !== undefined) {
    return {
      factor: REGIONAL_CARBON_FACTORS[category].factor,
      category: category,
      status: "estimate_applied",
      matching: {
        confidence: 0.60,
        match_type: "category_average"
      },
      uncertainty: {
        level: "medium"
      }
    };
  }
  
  // Level 4: Generic Fallback (2.0 kg CO2e/kg)
  return {
    factor: 2.0,
    category: category || "Other",
    status: "unmapped_penalty",
    matching: {
      confidence: 0.30,
      match_type: "fallback"
    },
    uncertainty: {
      level: "high"
    }
  };
};

/**
 * Calculates compliance grade and score points based on estimated CO2 emissions of a receipt.
 * @param {number} total_co2e - The total carbon footprint of the receipt in kg CO2e.
 * @returns {Object} An object containing the computed grade (A, B, C, D, or F) and score points.
 */
export const getReceiptGradeAndPoints = (total_co2e) => {
  let score = Math.max(15, Math.round(100 - (total_co2e - 5.0) * 8.5));
  if (score > 100) score = 100;
  
  let grade = "F";
  let points = 10;
  if (score >= 80) {
    grade = "A";
    points = 100;
  } else if (score >= 65) {
    grade = "B";
    points = 75;
  } else if (score >= 50) {
    grade = "C";
    points = 50;
  } else if (score >= 35) {
    grade = "D";
    points = 25;
  }
  return { grade, points };
};

/**
 * Computes individual climate metrics (global score, average weekly emissions, grade, and overall compliance score) across a list of receipts.
 * @param {Array<Object>} receiptList - The list of historical receipt documents.
 * @returns {Object} An object summarizing the user's aggregate climate statistics.
 */
export const calculateIndividualMetrics = (receiptList) => {
  if (receiptList.length === 0) {
    return { scoreValue: 0, averageWeekly: 0, grade: 'N/A', complianceScore: 0, totalEmissions: 0 };
  }

  const totalSum = receiptList.reduce((acc, curr) => acc + (curr.total_co2e || 0), 0);
  const averageWeekly = parseFloat((totalSum / receiptList.length).toFixed(2));

  // Cumulative points based on the grade of each receipt
  const scoreValue = receiptList.reduce((acc, curr) => {
    if (curr.points !== undefined) {
      return acc + curr.points;
    }
    const gp = getReceiptGradeAndPoints(curr.total_co2e || 0);
    return acc + gp.points;
  }, 0);

  // Dynamic average weekly grading logic
  let avgScore = Math.max(15, Math.round(100 - (averageWeekly - 5.0) * 8.5));
  if (avgScore > 100) avgScore = 100;

  let grade = "F";
  if (avgScore >= 80) grade = "A";
  else if (avgScore >= 65) grade = "B";
  else if (avgScore >= 50) grade = "C";
  else if (avgScore >= 35) grade = "D";

  return { scoreValue, averageWeekly, grade, complianceScore: avgScore, totalEmissions: parseFloat(totalSum.toFixed(2)) };
};

/**
 * Resolves a visual ranking badge text (badge emoji + rank description) based on active leaderboard rank and score value.
 * @param {number|string} rankVal - The user's active placement/rank on the leaderboard.
 * @param {number} scoreVal - The user's dynamic cumulative points score.
 * @returns {string} The formatted badge text.
 */
export const getRankBadge = (rankVal, scoreVal) => {
  if (rankVal === 1) return "🥇 Methane Slayer";
  if (rankVal === 2) return "🥈 Coal Minimizer";
  if (rankVal === 3) return "🥉 Carbon Crusader";
  if (scoreVal >= 80) return "🏅 Methane Slayer";
  if (scoreVal >= 65) return "🎖️ Coal Minimizer";
  return "🌱 Carbon Consumer";
};

/**
 * Calculates the current consecutive daily streak of qualifying carbon checkout logs.
 * Streaks must be consecutive daily uploads of a qualifying grade (A, B, or C) and require at least 2 days to initialize.
 * @param {Array<Object>} receipts - The list of receipt records.
 * @returns {number} The consecutive daily streak length (0 or >= 1).
 */
export const calculateDailyStreak = (receipts) => {
  if (!receipts || receipts.length === 0) return 0;

  // 1. Filter receipts that have grade 'A', 'B', or 'C'
  const qualifyingReceipts = receipts.filter(r => {
    const grade = r.grade || getReceiptGradeAndPoints(r.total_co2e || 0).grade;
    return ['A', 'B', 'C'].includes(grade);
  });

  if (qualifyingReceipts.length === 0) return 0;

  // Sort qualifying receipts by timestamp descending
  const sortedReceipts = [...qualifyingReceipts].sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });

  // 2. Check cancellation: "if receipt is not upload for 24 hrs since last then cancel the streak"
  const newestSec = sortedReceipts[0].timestamp?.seconds || Math.floor(Date.now() / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - newestSec > 24 * 60 * 60) {
    return 0; // Cancelled
  }

  // 3. Map to unique local date strings YYYY-MM-DD
  const uniqueDates = [];
  sortedReceipts.forEach(r => {
    const sec = r.timestamp?.seconds || Math.floor(Date.now() / 1000);
    const dateObj = new Date(sec * 1000);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    if (!uniqueDates.includes(dateStr)) {
      uniqueDates.push(dateStr);
    }
  });

  // Count consecutive calendar days
  let consecutiveDays = 0;
  if (uniqueDates.length > 0) {
    consecutiveDays = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const d1 = new Date(uniqueDates[i]);
      const d2 = new Date(uniqueDates[i + 1]);
      const diffTime = d1 - d2;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        consecutiveDays++;
      } else {
        break;
      }
    }
  }

  // "If receipt is entered for consecutive 2 days then start the streak from 1 then incing it day by day"
  if (consecutiveDays < 2) {
    return 0;
  }
  return consecutiveDays - 1;
};

