import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  serverTimestamp
} from 'firebase/firestore';

// Component Imports
import Leaderboard, { updateSquadAggregatedEmissions } from './components/Leaderboard';
import Uploader from './components/Uploader';
import Scorecard from './components/Scorecard';
import ActionPlan from './components/ActionPlan';
import Categories from './components/Categories';

// Logic Imports
import { 
  resolveEmissionsFactor, 
  getReceiptGradeAndPoints, 
  calculateIndividualMetrics,
  getRankBadge,
  REGIONAL_CARBON_FACTORS,
  calculateDailyStreak
} from './utils/logic';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

const appId = typeof __app_id !== 'undefined' ? __app_id : (import.meta.env.VITE_APP_ID || 'ecopulse-app');

// Safe Module Initializations
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userNickname, setUserNickname] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [tempLogName, setTempLogName] = useState("");
  const [activeUserId, setActiveUserId] = useState("");
  const [usersList, setUsersList] = useState([]);

  // Real-time Databases (Synchronized State Lists)
  const [myReceipts, setMyReceipts] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [currentUserStandings, setCurrentUserStandings] = useState(null);

  // Gamification & Communities
  const [squadCode, setSquadCode] = useState("GLOBAL");
  const [actionPointsBonus, setActionPointsBonus] = useState(0);
  const [showCongrats, setShowCongrats] = useState(false);
  const [hasQuestGradeUpgrade, setHasQuestGradeUpgrade] = useState(false);

  // User Selection / Interactive Controls
  const [activeTab, setActiveTab] = useState("overview"); // overview | quests | ledger | diagnostics
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [diagnosticTab, setDiagnosticTab] = useState("resolved"); // resolved | ocr_json

  // ==========================================
  // PHASE 1: Authentication Guard
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase auth loop broken: ", error);
        setErrorMessage("Secure authentication initialization failed. Check your network.");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize users list and create/restore session user on mount
  useEffect(() => {
    let storedUsers = [];
    try {
      storedUsers = JSON.parse(localStorage.getItem("ECOPULSE_USERS")) || [];
    } catch (e) {
      storedUsers = [];
    }

    const sessionUserId = sessionStorage.getItem("ECOPULSE_ACTIVE_USER_ID");
    const existingUser = sessionUserId ? storedUsers.find(u => u.uid === sessionUserId) : null;

    if (existingUser) {
      setUsersList(storedUsers);
      setActiveUserId(existingUser.uid);
      setUserNickname(existingUser.nickname);
    } else {
      const newUid = "USR_" + Math.random().toString(36).substring(2, 9).toUpperCase();
      const newNickname = `EcoSlayer_${newUid.substring(4)}`;
      const newUser = { uid: newUid, nickname: newNickname };

      const updatedUsers = [...storedUsers, newUser];
      localStorage.setItem("ECOPULSE_USERS", JSON.stringify(updatedUsers));
      sessionStorage.setItem("ECOPULSE_ACTIVE_USER_ID", newUid);
      setUsersList(updatedUsers);
      setActiveUserId(newUid);
      setUserNickname(newNickname);
    }
  }, []);

  // ==========================================
  // PHASE 2: Firestore Listeners
  // ==========================================
  // A: Listen to Private Receipt Entries
  useEffect(() => {
    if (!activeUserId) return;

    const privateQuery = query(collection(db, 'artifacts', appId, 'users', activeUserId, 'receipts'));
    const unsubscribePrivate = onSnapshot(privateQuery, (snapshot) => {
      const records = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      const sorted = records.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setMyReceipts(sorted);

      if (sorted.length > 0) {
        setSelectedReceipt(prev => {
          if (prev && sorted.some(r => r.id === prev.id)) {
            return sorted.find(r => r.id === prev.id);
          }
          return sorted[0];
        });
      } else {
        setSelectedReceipt(null);
      }
    }, (err) => {
      console.error("Could not fetch personal records: ", err);
    });

    return () => unsubscribePrivate();
  }, [activeUserId]);

  // Sync Current User's Specific Standings Document
  useEffect(() => {
    if (!activeUserId) {
      setCurrentUserStandings(null);
      return;
    }

    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserId);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserStandings({ uid: docSnap.id, ...docSnap.data() });
      } else {
        setCurrentUserStandings(null);
      }
    }, (error) => {
      console.error("Error syncing user standings document:", error);
    });

    return () => unsubscribe();
  }, [activeUserId]);

  // B: Listen to Public Leaderboard Data (Pointing to users collection)
  useEffect(() => {
    if (!user) return;

    const publicQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubscribePublic = onSnapshot(publicQuery, (snapshot) => {
      const standings = [];
      snapshot.forEach((docSnap) => {
        standings.push({ userId: docSnap.id, ...docSnap.data() });
      });
      // Sort by weekly emissions ASCENDING (lower emissions = better rank)
      const ranked = standings.sort((a, b) => (a.weeklyEmissions || 0) - (b.weeklyEmissions || 0));
      setGlobalLeaderboard(ranked);
    }, (err) => {
      console.error("Could not trace global ranks: ", err);
    });

    return () => unsubscribePublic();
  }, [user]);

  // ==========================================
  // PHASE 3: Public Profile Syncer
  // ==========================================
  const syncPublicCarbonProfile = useCallback(async (currentNickname, customReceipts = myReceipts, activeBonus = actionPointsBonus, activeUpgrade = hasQuestGradeUpgrade) => {
    if (!activeUserId) return;

    const stats = calculateIndividualMetrics(customReceipts);
    if (activeUpgrade) {
      const grades = ['F', 'D', 'C', 'B', 'A'];
      const idx = grades.indexOf(stats.grade);
      if (idx !== -1 && idx < grades.length - 1) {
        stats.grade = grades[idx + 1];
      }
    }
    const finalScore = Math.min(100, stats.scoreValue + activeBonus);
    const title = getRankBadge(10, finalScore).split(" ").slice(1).join(" ") || "Carbon Consumer";
    try {
      const publicProfileDoc = doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserId);
      await setDoc(publicProfileDoc, {
        displayName: currentNickname || userNickname,
        title: title,
        weeklyEmissions: stats.totalEmissions,
        scoreValue: finalScore,
        grade: stats.grade,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Recalculate dynamic footprint averages instantly if user has a squad
      if (currentUserStandings?.squadId) {
        await updateSquadAggregatedEmissions(currentUserStandings.squadId, db, appId);
      }
    } catch (err) {
      console.error("Error synchronizing public statistics: ", err);
    }
  }, [activeUserId, userNickname, myReceipts, actionPointsBonus, hasQuestGradeUpgrade, currentUserStandings?.squadId]);

  // Keep public leaderboard synced with latest receipts list dynamically
  useEffect(() => {
    if (activeUserId && myReceipts.length > 0) {
      syncPublicCarbonProfile(userNickname, myReceipts, actionPointsBonus, hasQuestGradeUpgrade);
    }
  }, [myReceipts, userNickname, activeUserId, actionPointsBonus, squadCode, syncPublicCarbonProfile, hasQuestGradeUpgrade]);

  // Quests callbacks & timer
  const handleQuestsCompleted = useCallback(() => {
    setActionPointsBonus(30);
    setHasQuestGradeUpgrade(true);
    setShowCongrats(true);
  }, []);

  const handleQuestsUncompleted = useCallback(() => {
    setActionPointsBonus(0);
    setHasQuestGradeUpgrade(false);
    setShowCongrats(false);
  }, []);

  useEffect(() => {
    if (showCongrats) {
      const timer = setTimeout(() => {
        setShowCongrats(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showCongrats]);

  const myCalculatedStats = useMemo(() => calculateIndividualMetrics(myReceipts), [myReceipts]);
  const finalCalculatedStats = useMemo(() => {
    const stats = { ...myCalculatedStats };
    stats.scoreValue = Math.min(100, stats.scoreValue + actionPointsBonus);
    if (hasQuestGradeUpgrade) {
      const grades = ['F', 'D', 'C', 'B', 'A'];
      const idx = grades.indexOf(stats.grade);
      if (idx !== -1 && idx < grades.length - 1) {
        stats.grade = grades[idx + 1];

        // Upgrade complianceScore to match the new grade benchmark
        if (stats.grade === 'A') stats.complianceScore = Math.max(stats.complianceScore, 85);
        else if (stats.grade === 'B') stats.complianceScore = Math.max(stats.complianceScore, 72);
        else if (stats.grade === 'C') stats.complianceScore = Math.max(stats.complianceScore, 57);
        else if (stats.grade === 'D') stats.complianceScore = Math.max(stats.complianceScore, 42);
      }
    }
    return stats;
  }, [myCalculatedStats, hasQuestGradeUpgrade, actionPointsBonus]);
  const dailyStreak = useMemo(() => calculateDailyStreak(myReceipts), [myReceipts]);

  const userRankData = useMemo(() => {
    if (globalLeaderboard.length === 0 || !activeUserId) return { rank: "-", total: "-", percentile: "-" };
    const myRankIdx = globalLeaderboard.findIndex(item => item.userId === activeUserId);
    if (myRankIdx === -1) return { rank: "~", total: globalLeaderboard.length, percentile: "-" };
    const rank = myRankIdx + 1;
    const total = globalLeaderboard.length;
    const percentile = total > 1 ? Math.round(((total - rank) / (total - 1)) * 100) : 100;
    return { rank, total, percentile };
  }, [globalLeaderboard, activeUserId]);



  // ==========================================
  // PHASE 4: Dual-Agent Core Execution
  // ==========================================
  const executeCarbonPipeline = useCallback(async (textPayload, matchedPreset = null) => {
    setIsProcessing(true);
    setErrorMessage("");

    let resolvedResult = null;

    try {
      if (matchedPreset) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const total_co2e = matchedPreset.items.reduce((sum, item) => sum + (item.co2e_kg || 0), 0);
        const { grade, points } = getReceiptGradeAndPoints(total_co2e);
        resolvedResult = {
          merchant: matchedPreset.merchant,
          rawText: matchedPreset.rawText,
          items: matchedPreset.items,
          total_co2e,
          grade,
          points
        };
      } else {
        const systemPrompt = `You are a deterministic, zero-hallucination carbon extraction engine for Indian Quick Commerce.
        Map each item in the raw invoice text using this multi-level fallback emission mapping system:

        1. Exact Product Match: If a product is exactly known in database, use its specific factor.
        2. Product Type Match: Match the item name to one of these product types:
           - vegetables (e.g. potato, onion, tomato, spinach): 0.5 kg CO2e/kg
           - fruits (e.g. banana, apple, orange, mango, berries): 0.7 kg CO2e/kg
           - wheat/atta/flour/roti/bread/oats/grain: 1.5 kg CO2e/kg
           - rice/basmati/paddy: 2.7 kg CO2e/kg
           - pulses/dal/lentils/legumes: 0.9 kg CO2e/kg
           - plant milk (e.g. almond/oat/soy milk): 1.0 kg CO2e/L
           - milk: 1.4 kg CO2e/L
           - yogurt/curd/dahi/paneer: 2.0 kg CO2e/kg
           - cheese: 9.0 kg CO2e/kg
           - butter/ghee: 11.5 kg CO2e/kg
           - eggs: 3.5 kg CO2e/kg
           - chicken/poultry: 4.5 kg CO2e/kg
           - pork: 6.0 kg CO2e/kg
           - fish/seafood: 5.0 kg CO2e/kg
           - beef: 30.0 kg CO2e/kg
           - cooking oil (e.g. mustard/olive/sunflower oil): 3.5 kg CO2e/kg
           - sugar/sweeteners/honey: 2.0 kg CO2e/kg
           - tea: 5.0 kg CO2e/kg
           - coffee: 22.5 kg CO2e/kg
           - cookies/biscuits: 2.5 kg CO2e/kg
           - chips/snacks: 2.5 kg CO2e/kg
           - household cleaning products: 2.0 kg CO2e/kg
           - personal care products (shampoo, toothpaste): 2.0 kg CO2e/kg
        3. Category Average Match: If no specific product type matches, map the item to one of these 19 categories and use its average factor:
           - Dairy: 5.98
           - Plant Milks: 1.0
           - Rice & Grains: 2.1
           - Legumes & Pulses: 0.9
           - Vegetables: 0.5
           - Fruits: 0.7
           - Meat: 18.0
           - Poultry: 4.5
           - Eggs: 3.5
           - Seafood: 5.0
           - Cooking Oils: 3.5
           - Beverages: 13.75
           - Packaged Snacks: 2.5
           - Bakery & Cereals: 2.0
           - Condiments & Sweeteners: 2.0
           - Frozen Foods: 2.0
           - Personal Care: 2.0
           - Household Cleaning: 2.0
           - Other: 2.0
        4. Generic Fallback: Use 2.0 kg CO2e/kg as a generic fallback.

        Return a strict raw JSON array mapping only, do not output explanations or markdown. Format:
        {
          "merchant": "Zepto" | "Blinkit" | "Swiggy Instamart" | "Unknown",
          "items": [
            {
              "raw_name": "Exact matching string name",
              "category": "Dairy" | "Plant Milks" | "Rice & Grains" | "Legumes & Pulses" | "Vegetables" | "Fruits" | "Meat" | "Poultry" | "Eggs" | "Seafood" | "Cooking Oils" | "Beverages" | "Packaged Snacks" | "Bakery & Cereals" | "Condiments & Sweeteners" | "Frozen Foods" | "Personal Care" | "Household Cleaning" | "Other",
              "quantity": number,
              "pack_size": "extracted size description",
              "co2e_kg": quantity * (pack_size_in_kg_or_L * factor),
              "factor": number,
              "status": "mapped" | "estimate_applied" | "unmapped_penalty"
            }
          ]
        }`;

        const headers = { 
          'Content-Type': 'application/json'
        };

        const endpoint = `/api/gemini?model=gemini-2.5-flash`;

        let apiResponse;
        let delayTime = 1000;
        for (let retry = 0; retry < 3; retry++) {
          try {
            apiResponse = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                contents: [{ parts: [{ text: textPayload }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json" }
              })
            });
            if (apiResponse.ok) break;
          } catch (e) {
            if (retry === 2) throw e;
          }
          await new Promise(r => setTimeout(r, delayTime));
          delayTime *= 2;
        }

        if (!apiResponse || !apiResponse.ok) {
          let errorMsg = `API returned error code ${apiResponse?.status || 'Unknown'}`;
          try {
            const errData = await apiResponse.json();
            if (errData && errData.error) {
              errorMsg = errData.error;
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const data = await apiResponse.json();
        const rawJsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedObject = JSON.parse(rawJsonString);

        const processedItems = (parsedObject.items || []).map(item => {
          const qty = item.quantity || 1;
          const nameLower = item.raw_name.toLowerCase();

          // Layer 1: Raw Text
          const raw = {
            raw_name: item.raw_name,
            quantity: qty,
            pack_size: item.pack_size || ""
          };

          // Layer 2: Product Normalization
          let resolution = resolveEmissionsFactor(item.raw_name, item.category);

          let unit_weight_kg = 1.0;
          let is_mass_based = true;
          let matched_product_name = item.raw_name;

          // Apply normalization conversion logic
          if (nameLower.includes("chocolate bar") || nameLower.includes("chocolate")) {
            unit_weight_kg = 0.05; 
            resolution = {
              factor: 2.5, category: "Packaged Snacks", status: "mapped",
              matching: { confidence: 0.97, match_type: "exact" },
              uncertainty: { level: "low" }
            };
          } else if (resolution.category === "Eggs" || nameLower.includes("egg")) {
            is_mass_based = false;
            let eggCount = 6;
            const eggMatch = nameLower.match(/(\d+)\s*egg/);
            if (eggMatch) {
              eggCount = parseInt(eggMatch[1], 10);
            } else if (item.pack_size) {
              const packLower = item.pack_size.toLowerCase();
              const packMatch = packLower.match(/(\d+)\s*(ct|pc|egg|pack)/);
              if (packMatch) {
                eggCount = parseInt(packMatch[1], 10);
              }
            }
            unit_weight_kg = eggCount * 0.06;
            resolution.matching = { confidence: 0.97, match_type: "exact" };
            resolution.uncertainty = { level: "low" };
          } else if (nameLower.includes("toilet paper") || nameLower.includes("toilet") || nameLower.includes("tissue") || nameLower.includes("paper")) {
            if (resolution.category === "Household Cleaning") {
              is_mass_based = false;
              let rollCount = 4;
              const rollMatch = nameLower.match(/(\d+)\s*(roll|pack|pc)/);
              if (rollMatch) {
                rollCount = parseInt(rollMatch[1], 10);
              } else if (item.pack_size) {
                const packLower = item.pack_size.toLowerCase();
                const packMatch = packLower.match(/(\d+)\s*(roll|pack|pc|ct)/);
                if (packMatch) {
                  rollCount = parseInt(packMatch[1], 10);
                }
              }
              unit_weight_kg = rollCount * 0.15;
              resolution.matching = { confidence: 0.97, match_type: "exact" };
              resolution.uncertainty = { level: "low" };
            }
          } else if (nameLower.includes("watermelon")) {
            unit_weight_kg = 4.0;
            resolution = {
              factor: 0.7, category: "Fruits", status: "mapped",
              matching: { confidence: 0.97, match_type: "exact" },
              uncertainty: { level: "low" }
            };
          } else if (nameLower.includes("spinach") && (nameLower.includes("bunch") || (item.pack_size && item.pack_size.toLowerCase().includes("bunch")))) {
            let bunchCount = 1;
            const bunchMatch = nameLower.match(/(\d+)\s*bunch/);
            if (bunchMatch) {
              bunchCount = parseInt(bunchMatch[1], 10);
            } else if (item.pack_size) {
              const packLower = item.pack_size.toLowerCase();
              const packMatch = packLower.match(/(\d+)\s*bunch/);
              if (packMatch) {
                bunchCount = parseInt(packMatch[1], 10);
              }
            }
            unit_weight_kg = bunchCount * 1.0;
            resolution.matching = { confidence: 0.97, match_type: "exact" };
            resolution.uncertainty = { level: "low" };
          } else if (item.pack_size) {
            const sizeStr = item.pack_size.toLowerCase();
            const numMatch = sizeStr.match(/([0-9.]+)\s*(g|kg|l|ml|oz|lb)/);
            if (numMatch) {
              let val = parseFloat(numMatch[1]);
              const unit = numMatch[2];
              if (unit === 'g' || unit === 'ml') {
                unit_weight_kg = val / 1000;
              } else if (unit === 'lb') {
                unit_weight_kg = val * 0.45;
              } else if (unit === 'oz') {
                unit_weight_kg = val * 0.028;
              } else {
                unit_weight_kg = val;
              }
            }
          }

          const total_weight_kg = parseFloat((qty * unit_weight_kg).toFixed(3));

          const normalized = {
            product_name: matched_product_name,
            category: resolution.category,
            unit_weight_kg: parseFloat(unit_weight_kg.toFixed(3)),
            total_weight_kg,
            is_mass_based
          };

          // Layer 3: Emission Record
          const co2e_kg = parseFloat((total_weight_kg * resolution.factor).toFixed(3));

          const emission = {
            factor: resolution.factor,
            co2e_kg,
            status: resolution.status,
            matching: resolution.matching,
            uncertainty: resolution.uncertainty
          };

          return {
            raw,
            normalized,
            emission,
            raw_name: item.raw_name,
            category: resolution.category,
            quantity: qty,
            pack_size: item.pack_size || (nameLower.includes("chocolate") ? "50 g" : nameLower.includes("spinach") ? "1 bunch" : nameLower.includes("watermelon") ? "1 pc" : "1 kg"),
            factor: resolution.factor,
            co2e_kg,
            status: resolution.status,
            matching: resolution.matching,
            uncertainty: resolution.uncertainty
          };
        });

        const finalEmissionsSum = parseFloat(processedItems.reduce((sum, item) => sum + (item.co2e_kg || 0), 0).toFixed(2));
        const { grade, points } = getReceiptGradeAndPoints(finalEmissionsSum);

        resolvedResult = {
          merchant: parsedObject.merchant || "Standard Order",
          rawText: textPayload,
          items: processedItems,
          total_co2e: finalEmissionsSum,
          grade,
          points
        };
      }

      // Save Private Entry
      if (activeUserId && resolvedResult) {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', activeUserId, 'receipts'), {
          merchant: resolvedResult.merchant,
          rawText: resolvedResult.rawText,
          items: resolvedResult.items,
          total_co2e: resolvedResult.total_co2e,
          grade: resolvedResult.grade,
          points: resolvedResult.points,
          timestamp: serverTimestamp()
        });

        const updatedReceiptsList = [
          { id: docRef.id, ...resolvedResult, timestamp: { seconds: Math.floor(Date.now() / 1000) } },
          ...myReceipts
        ];
        setMyReceipts(updatedReceiptsList);
        setSelectedReceipt(updatedReceiptsList[0]);

        await syncPublicCarbonProfile(userNickname, updatedReceiptsList);
      }

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Pipeline execution failed. Try using presets.");
    } finally {
      setIsProcessing(false);
    }
  }, [activeUserId, myReceipts, userNickname, syncPublicCarbonProfile]);

  const handleUpdateNickname = useCallback(async () => {
    if (!userNickname.trim()) return;
    setIsEditingName(false);

    const updatedUsers = usersList.map(u => u.uid === activeUserId ? { ...u, nickname: userNickname.trim() } : u);
    setUsersList(updatedUsers);
    localStorage.setItem("ECOPULSE_USERS", JSON.stringify(updatedUsers));

    await syncPublicCarbonProfile(userNickname);
  }, [userNickname, usersList, activeUserId, syncPublicCarbonProfile]);

  const handleSaveLogName = useCallback(async (recordId) => {
    if (!tempLogName.trim()) {
      setEditingLogId(null);
      return;
    }

    try {
      const recordDocRef = doc(db, 'artifacts', appId, 'users', activeUserId, 'receipts', recordId);
      await updateDoc(recordDocRef, { merchant: tempLogName.trim() });

      if (selectedReceipt && selectedReceipt.id === recordId) {
        setSelectedReceipt(prev => ({ ...prev, merchant: tempLogName.trim() }));
      }
    } catch (err) {
      console.error("Failed to rename log: ", err);
      setErrorMessage("Failed to rename log: " + err.message);
    } finally {
      setEditingLogId(null);
    }
  }, [tempLogName, activeUserId, selectedReceipt]);

  const handleSwitchUser = useCallback((selectedUid) => {
    const targetUser = usersList.find(u => u.uid === selectedUid);
    if (targetUser) {
      setActiveUserId(selectedUid);
      setUserNickname(targetUser.nickname);
      sessionStorage.setItem("ECOPULSE_ACTIVE_USER_ID", selectedUid);
      setSelectedReceipt(null);
    }
  }, [usersList]);

  const getEcoStateIndicator = (grade) => {
    let tooltipText = "";
    let emojiElement = null;

    switch(grade) {
      case 'A':
        tooltipText = "Incredible work! You are thriving.";
        emojiElement = <span className="text-3xl text-primary-400 animate-bounce block" aria-label="Thriving Tree">🌳</span>;
        break;
      case 'B':
        tooltipText = "Great momentum! Keep growing.";
        emojiElement = <span className="text-3xl text-primary-500 animate-pulse block" aria-label="Growing Plant">🌿</span>;
        break;
      case 'C':
        tooltipText = "Fresh start. Nurture your progress!";
        emojiElement = <span className="text-3xl text-primary-500 block" aria-label="Seedling">🌱</span>;
        break;
      case 'D':
        tooltipText = "Don't fade now—you've got this!";
        emojiElement = <span className="text-3xl text-orange-500 opacity-70 grayscale-50 animate-pulse block" aria-label="Wilted Leaf">🍂</span>;
        break;
      case 'F':
        tooltipText = "Time to reset and recharge.";
        emojiElement = <span className="text-3xl text-red-500 opacity-70 grayscale animate-pulse block" aria-label="Smog Cloud">☁️</span>;
        break;
      default:
        tooltipText = "Unknown Status";
        emojiElement = <span className="text-3xl text-text-500 block" aria-label="Unknown Status">❓</span>;
        break;
    }

    return (
      <div className="relative group cursor-pointer flex items-center justify-center">
        {emojiElement}
        <div className="absolute bottom-full mb-2 w-max max-w-[200px] bg-bg-850 border border-border-soft text-text-300 text-xs px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center font-sans z-50">
          {tooltipText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-bg-850"></div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A13] flex flex-col items-center justify-center text-text-100">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-border-soft"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-mono text-text-500">Syncing with EcoPulse Public Ledger...</p>
      </div>
    );
  }

  const renderOverviewTab = () => {  
    return (  
      <div className="space-y-6">  
          
        {/* Row 1: Parameter Stat Widgets */}  
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">  
          <div className="bg-surface-800 border border-border-soft rounded-[18px] p-5 shadow-sm">  
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block mb-1">Active Streak</span>  
            <span className="text-2xl font-extrabold text-amber-500 font-mono">🔥 {dailyStreak} Day{dailyStreak !== 1 ? 's' : ''}</span>  
          </div>

          <div className="bg-surface-800 border border-border-soft rounded-[18px] p-5 shadow-sm">  
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block mb-1">Global Score</span>  
            <span className="text-2xl font-extrabold text-amber-500 font-mono">{finalCalculatedStats.scoreValue} Pts</span>  
          </div>

          <div className="bg-surface-800 border border-border-soft rounded-[18px] p-5 flex flex-col items-center justify-center shadow-sm">  
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block mb-1 w-full text-left">Active Compliance</span>  
            {getEcoStateIndicator(finalCalculatedStats.grade)}  
          </div>

          <div className="bg-surface-800 border border-border-soft rounded-[18px] p-5 shadow-sm">  
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block mb-1">Active Outlay</span>  
            <span className="text-2xl font-extrabold text-text-100">{(selectedReceipt?.total_co2e || 0).toFixed(2)} kg</span>  
          </div>  
        </div>

        {/* Row 2: Scorecard Container */}  
        <Scorecard   
          userNickname={userNickname}   
          myCalculatedStats={finalCalculatedStats}   
          userRankData={userRankData}   
          selectedReceipt={selectedReceipt}   
          myReceipts={myReceipts}   
        />

        {/* Row 3: Basket Breakdown Table */}  
        <div className="bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm">  
          <h2 className="text-sm font-extrabold text-text-100 uppercase tracking-wider mb-4">Your Basket Breakdown</h2>  
          <div className="overflow-x-auto">  
            <table className="w-full text-left border-collapse text-xs">  
              <thead>  
                <tr className="text-text-500 font-bold border-b border-border-soft">  
                  <th className="pb-2.5">Consumable Item</th>  
                  <th className="pb-2.5 text-center">Qty</th>  
                  <th className="pb-2.5">Pack Size</th>  
                  <th className="pb-2.5 text-right">CO2e (kg)</th>  
                </tr>  
              </thead>  
              <tbody className="divide-y divide-border-soft">  
                {(selectedReceipt?.items || []).map((item, index) => (  
                  <tr key={index} className="text-text-300">  
                    <td className="py-3 font-semibold text-text-100">  
                      <div className="flex flex-col">  
                        <span>{item.raw_name}</span>  
                        {item.status === 'unmapped_penalty' && (  
                          <span className="text-[8px] text-red-500/90 font-mono">unmapped baseline penalty</span>  
                        )}  
                      </div>  
                    </td>  
                    <td className="py-3 text-center font-mono">{item.quantity}</td>  
                    <td className="py-3 text-text-500 font-mono">{item.pack_size || '-'}</td>  
                    <td className="py-3 text-right font-mono font-bold text-amber-500">{(item.co2e_kg || 0).toFixed(2)}</td>  
                  </tr>  
                ))}  
              </tbody>  
            </table>  
          </div>  
        </div>

        {/* Row 4: OCR Input Panel */}  
        <div className="bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm">  
          <h2 className="text-sm font-extrabold text-text-100 uppercase tracking-wider mb-4">Log a New Purchase</h2>  
          <Uploader   
            executeCarbonPipeline={executeCarbonPipeline}   
            isProcessing={isProcessing}   
            errorMessage={errorMessage}   
          />  
        </div>

      </div>  
    );  
  };

  const renderQuestsTab = () => {  
    return (  
      <div className="max-w-2xl mx-auto">  
        <ActionPlan 
          selectedReceipt={selectedReceipt} 
          setActionPointsBonus={setActionPointsBonus} 
          onQuestsCompleted={handleQuestsCompleted}
          onQuestsUncompleted={handleQuestsUncompleted}
        />  
      </div>  
    );  
  };

  const renderLedgerTab = () => {  
    return (  
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">  
        <div className="lg:col-span-6 bg-surface-800 border border-border-soft rounded-[18px] p-6 shadow-sm">  
          <h2 className="text-sm font-extrabold text-text-100 uppercase tracking-wider mb-4">My Checkout Logs</h2>  
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">  
            {myReceipts.map((record, index) => {
              const isEditing = editingLogId === record.id;
              return (
                <div  
                  key={record.id || index}  
                  onClick={() => setSelectedReceipt(record)}  
                  className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition cursor-pointer ${  
                    selectedReceipt?.id === record.id   
                      ? 'bg-surface-700 border-primary-300/20'   
                      : 'bg-bg-850 border-border-soft hover:bg-surface-700/50'  
                  }`}  
                >  
                  <div className="flex-1 min-w-0 pr-4">  
                    {isEditing ? (
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={tempLogName}
                          onChange={(e) => setTempLogName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveLogName(record.id);
                            if (e.key === 'Escape') setEditingLogId(null);
                          }}
                          className="bg-surface-800 border border-border-soft rounded px-2 py-1 text-xs text-text-100 font-bold focus:outline-none w-full"
                          autoFocus
                          aria-label="Rename log merchant input"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLogName(record.id)}
                          className="text-[10px] text-primary-400 font-bold hover:text-primary-300"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingLogId(null)}
                          className="text-[10px] text-text-500 hover:text-text-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 group/log">  
                        <h3 className="text-xs font-bold text-text-100 truncate">{record.merchant}</h3>  
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingLogId(record.id);
                            setTempLogName(record.merchant || "");
                          }}
                          className="opacity-0 group-hover/log:opacity-100 focus:opacity-100 text-[10px] text-amber-500 hover:text-amber-400 transition px-1"
                          aria-label={`Rename ${record.merchant}`}
                        >
                          ✏️
                        </button>
                      </div>  
                    )}
                    <span className="text-[9px] text-text-500 block mt-1">  
                      {record.timestamp?.seconds ? new Date(record.timestamp.seconds * 1000).toLocaleDateString() : 'Syncing...'}  
                    </span>  
                  </div>  
                  <div className="text-right shrink-0">  
                    <span className="text-xs font-bold text-amber-500 font-mono">{(record.total_co2e || 0).toFixed(2)} kg</span>  
                    <span className="text-[10px] block text-text-500">Grade {record.grade}</span>  
                  </div>  
                </div>  
              );
            })}  
          </div>  
        </div>  
        <div className="lg:col-span-6">  
          <Leaderboard 
            currentUser={currentUserStandings}
            currentUserStats={finalCalculatedStats}
            activeUserId={activeUserId}
            db={db}
            appId={appId}
            auth={auth}
          />  
        </div>  
      </div>  
    );  
  };

  return (  
    <div className="min-h-screen font-sans antialiased flex flex-col md:flex-row bg-bg-900 text-text-100">

      {/* === SIDEBAR (Inspired by PodCaster Dashboard Template) === */}  
      <aside className="w-full md:w-64 bg-bg-850 border-r border-border-soft flex flex-col justify-between p-5 flex-shrink-0">  
        <div className="space-y-6">

          {/* Profile Widget with gold elements for nickname and active badge */}  
          <div className="flex items-center justify-between bg-surface-800 border border-border-soft p-3 rounded-[18px] shadow-sm">  
            <div className="flex items-center space-x-3 overflow-hidden">  
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-300 border border-primary-300/20 font-bold shrink-0">  
                {userNickname.charAt(0) || "E"}  
              </div>  
              <div className="min-w-0">  
                {isEditingName ? (  
                  <input  
                    type="text"  
                    value={userNickname}  
                    onChange={(e) => setUserNickname(e.target.value)}  
                    onBlur={handleUpdateNickname}  
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateNickname()}  
                    className="bg-surface-700 border border-white/10 text-xs font-bold text-text-100 rounded px-1.5 w-28 focus:outline-none"  
                    autoFocus  
                  />  
                ) : (  
                  <div className="flex items-center space-x-1">  
                    <span className="text-sm font-extrabold text-amber-500 truncate block max-w-[110px] cursor-pointer" onClick={() => setIsEditingName(true)}>  
                      {userNickname}  
                    </span>  
                    <span className="text-[10px] text-text-500 cursor-pointer" onClick={() => setIsEditingName(true)}>✏️</span>  
                  </div>  
                )}  
                <span className="text-[10px] text-primary-300/80 block truncate font-semibold">  
                  {getRankBadge(userRankData.rank, finalCalculatedStats.scoreValue)}  
                </span>  
              </div>  
            </div>

            {/* Quick-action switch user button */}  
            <button   
              type="button"  
              onClick={() => {  
                const nextIndex = (usersList.findIndex(u => u.uid === activeUserId) + 1) % usersList.length;  
                if (usersList[nextIndex]) handleSwitchUser(usersList[nextIndex].uid);  
              }}  
              aria-label="Switch User Profile"  
              className="w-8 h-8 rounded-xl bg-primary-500 hover:bg-primary-400 text-text-100 flex items-center justify-center font-bold transition shrink-0"  
            >  
              +  
            </button>  
          </div>

          {/* Navigation tabs matching template style */}  
          <nav className="space-y-1">  
            <span className="text-[10px] text-text-500 uppercase tracking-widest font-extrabold block px-3 mb-2">Workspace</span>  
            <button  
              type="button"  
              onClick={() => setActiveTab("overview")}  
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${  
                activeTab === "overview"   
                  ? "bg-primary-500 text-text-100 shadow-md shadow-primary-500/10"   
                  : "text-text-300 hover:text-text-100 hover:bg-surface-800/50"  
              }`}  
            >  
              <span>🌿</span>  
              <span>Overview</span>  
            </button>

            <button  
              type="button"  
              onClick={() => setActiveTab("quests")}  
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${  
                activeTab === "quests"   
                  ? "bg-primary-500 text-text-100 shadow-md shadow-primary-500/10"   
                  : "text-text-300 hover:text-text-100 hover:bg-surface-800/50"  
              }`}  
            >  
              <span>🎯</span>  
              <span>Weekly Quests</span>  
            </button>

            <button  
              type="button"  
              onClick={() => setActiveTab("ledger")}  
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${  
                activeTab === "ledger"   
                  ? "bg-primary-500 text-text-100 shadow-md shadow-primary-500/10"   
                  : "text-text-300 hover:text-text-100 hover:bg-surface-800/50"  
              }`}  
            >  
              <span>📊</span>  
              <span>Collective Ledger</span>  
            </button>  
            
            <button  
              type="button"  
              onClick={() => setActiveTab("categories")}  
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${  
                activeTab === "categories"   
                  ? "bg-primary-500 text-text-100 shadow-md shadow-primary-500/10"   
                  : "text-text-300 hover:text-text-100 hover:bg-surface-800/50"  
              }`}  
            >  
              <span>🏷️</span>  
              <span>Categories</span>  
            </button>  
          </nav>  
        </div>

        {/* Tree-Ring Leaf Mark Brand Identifier at Bottom of Sidebar */}  
        <div className="pt-6 border-t border-border-soft flex items-center space-x-3">  
          <div className="text-primary-300 shrink-0">  
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">  
              <path d="M12 2C7 2 3 6 3 11c0 5 9 11 9 11s9-6 9-11c0-5-4-9-9-9Z" />  
              <path d="M12 6c-2.5 0-4.5 1.5-4.5 3.5 0 2 4.5 5.5 4.5 5.5s4.5-3.5 4.5-5.5C16.5 7.5 14.5 6 12 6Z" />  
            </svg>  
          </div>  
          <div>  
            <h2 className="text-sm font-bold text-text-100 tracking-tight">EcoPulse</h2>  
            <p className="text-[9px] text-text-500 tracking-wider font-semibold">Collective Climate Intelligence</p>  
          </div>  
        </div>  
      </aside>

      {/* === MAIN CONTAINER === */}  
      <main className="flex-1 flex flex-col min-w-0 bg-bg-900">

        {/* Sub-Header bar for Key & Streak configurations */}  
        <header className="border-b border-border-soft bg-bg-850/90 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">  
          <div>  
            <h1 className="text-lg font-bold text-text-100 tracking-tight">Climate Impact Monitor</h1>  
            <p className="text-xs text-text-500 font-medium">Transforming daily purchases into planetary action.</p>  
          </div>  
        </header>

        {/* Render Active View Panels */}  
        <div className={`p-6 max-w-7xl w-full mx-auto space-y-6 transition-all duration-1000 will-change-transform ${
          (finalCalculatedStats.grade === 'D' || finalCalculatedStats.grade === 'F') ? 'grayscale-[0.4] saturate-50 opacity-90' : ''
        }`}>  
          {activeTab === "overview" && renderOverviewTab()}  
          {activeTab === "quests" && renderQuestsTab()}  
          {activeTab === "ledger" && renderLedgerTab()}  
          {activeTab === "categories" && <Categories myReceipts={myReceipts} />}  
        </div>  
      </main>  

      {/* --- SLIDING CONGRATS BANNER OVERLAY --- */}
      <div 
        className={`fixed left-4 right-4 md:left-auto md:right-6 bottom-6 md:w-96 bg-gradient-to-r from-emerald-600 to-teal-600 text-text-100 p-4 rounded-2xl font-bold shadow-2xl transition-all duration-500 ease-out transform z-50 flex items-center space-x-3 border border-emerald-400/30 ${
          showCongrats ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="text-2xl animate-bounce">🎉</div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs uppercase tracking-wider text-emerald-100 font-extrabold">Weekly Quests Completed!</p>
          <p className="text-[11px] text-white/90 font-medium mt-0.5">Your climate compliance grade has been upgraded by 1 step!</p>
        </div>
        <button 
          type="button" 
          onClick={() => setShowCongrats(false)}
          className="text-white/60 hover:text-white text-xs font-bold transition shrink-0 self-start"
          aria-label="Dismiss congrats toast"
        >
          ✕
        </button>
      </div>

    </div>  
  );
}