import React, { useState, useEffect } from 'react';  
import {   
  collection,   
  doc,   
  onSnapshot,   
  updateDoc,   
  setDoc,  
  getDocs,  
  getDoc,  
  arrayUnion  
} from 'firebase/firestore';
import { getRankBadge } from '../utils/logic';

// Shared aggregated emissions calculation helper
export const updateSquadAggregatedEmissions = async (squadId, db, appId) => {  
  if (!squadId) return;

  try {  
    const squadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'squads', squadId);  
    const squadSnap = await getDoc(squadDocRef);  
    if (!squadSnap.exists()) return;  
      
    const { members } = squadSnap.data();  
    if (!members || members.length === 0) return;

    let totalEmissions = 0;  
    let actualMemberCount = 0;

    // Batch query user profiles to calculate correct weekly totals  
    const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');  
    const usersSnap = await getDocs(usersCollectionRef);

    usersSnap.forEach((userDoc) => {  
      if (members.includes(userDoc.id)) {  
        totalEmissions += (userDoc.data().weeklyEmissions || 0);  
        actualMemberCount++;  
      }  
    });

    const calculatedAverage = actualMemberCount > 0 ? (totalEmissions / actualMemberCount) : 0;

    // Update the standings board record with the computed average  
    await updateDoc(squadDocRef, {  
      averageEmissions: calculatedAverage  
    });

  } catch (error) {  
    console.error("Aggregation pipeline failure:", error);  
  }  
};

export default function Leaderboard({ currentUser, currentUserStats, activeUserId, db, appId, auth }) {  
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'squad'  
  const [leaderboardData, setLeaderboardData] = useState([]);  
  const [mySquad, setMySquad] = useState(null);

  // Sync Leaderboard Data based on Tab choice
  // Bound to [activeTab, currentUser] to fix auth reactivity bug
  useEffect(() => {  
    if (!auth?.currentUser) return;

    const collectionName = activeTab === 'individual' ? 'users' : 'squads';  
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);

    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {  
      const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));  
        
      // Execute sorting/filtering completely in-memory to prevent Firebase query index errors  
      if (activeTab === 'individual') {  
        // Lower footprint (weeklyEmissions) ranks higher (ascending order)
        docs.sort((a, b) => (a.weeklyEmissions || 0) - (b.weeklyEmissions || 0));  
      } else {  
        // Lower average emissions (averageEmissions) ranks higher (ascending order)
        docs.sort((a, b) => (a.averageEmissions || 0) - (b.averageEmissions || 0));  
      }

      setLeaderboardData(docs.slice(0, 10)); // Limit to Top 10  
    }, (error) => {  
      console.error("Firestore listener error:", error);  
    });

    return () => unsubscribe();  
  }, [activeTab, currentUser, db, appId, auth]);

  // Sync Current User's Specific Squad Document  
  useEffect(() => {  
    if (!currentUser?.squadId) {  
      setMySquad(null);  
      return;  
    }

    const squadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'squads', currentUser.squadId);  
    const unsubscribe = onSnapshot(squadDocRef, (docSnap) => {  
      if (docSnap.exists()) {  
        setMySquad({ id: docSnap.id, ...docSnap.data() });  
      }  
    }, (error) => {  
      console.error("Error syncing squad doc:", error);  
    });

    return () => unsubscribe();  
  }, [currentUser?.squadId, db, appId]);

  return (  
    <div className="bg-surface-800 rounded-[18px] p-6 border border-border-soft flex flex-col h-full text-text-100">  
      <h3 className="text-xs font-bold text-text-500 mb-4 tracking-wider uppercase">  
        Indian Subcontinent Standings Map  
      </h3>  

      {/* Tab Switcher Interface */}  
      <div className="flex space-x-1 bg-bg-900 p-1 rounded-xl mb-4 border border-border-soft">  
        <button  
          type="button"  
          onClick={() => setActiveTab('individual')}  
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${  
            activeTab === 'individual' ? 'bg-primary-500 text-text-100 shadow-md shadow-primary-500/10' : 'text-text-500 hover:text-text-300'  
          }`}  
        >  
          Individual  
        </button>  
        <button  
          type="button"  
          onClick={() => setActiveTab('squad')}  
          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${  
            activeTab === 'squad' ? 'bg-primary-500 text-text-100 shadow-md shadow-primary-500/10' : 'text-text-500 hover:text-text-300'  
          }`}  
        >  
          Squads  
        </button>  
      </div>  

      {/* Dynamic Sub-Views */}  
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[300px]">  
        {activeTab === 'individual' ? (  
          leaderboardData.length === 0 ? (
            <div className="py-8 text-center text-text-500 text-xs border border-dashed border-border-soft rounded-xl">
              Leaderboard is currently empty.
            </div>
          ) : (
            leaderboardData.map((user, idx) => {
              const isMe = user.id === activeUserId;
              return (
                <div key={user.id} className={`flex justify-between items-center p-3 rounded-xl border transition ${isMe ? 'bg-primary-500/10 border-primary-500/30' : 'bg-surface-700 border-border-soft'}`}>  
                  <div className="flex items-center space-x-3">  
                    <span className={`text-xs font-bold font-mono ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-text-300' : idx === 2 ? 'text-amber-500' : 'text-text-500'}`}>#{idx + 1}</span>  
                    <div>  
                      <p className="text-xs font-bold text-text-100 flex items-center">
                        {user.displayName || 'Eco-Warrior'}
                        {isMe && (
                          <span className="text-[9px] bg-primary-500/10 text-primary-400 border border-primary-500/20 px-1.5 py-0.2 rounded font-normal ml-1">
                            You
                          </span>
                        )}
                      </p>  
                      <p className="text-[10px] text-text-500">{user.title || 'Methane Slayer'}</p>  
                    </div>  
                  </div>  
                  <p className="text-xs font-mono font-bold text-primary-300">{(user.weeklyEmissions || 0).toFixed(2)} kg/wk</p>  
                </div>  
              );
            })
          )
        ) : (  
          <div className="space-y-4">  
            {mySquad ? (  
              /* Active Squad Details */  
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">  
                <div className="flex justify-between items-center mb-2">  
                  <h4 className="text-xs font-bold text-primary-300">🔥 {mySquad.name}</h4>  
                  <span className="text-[10px] text-text-400 font-mono">{mySquad.members?.length}/4 Members</span>  
                </div>  
                  
                {mySquad.members?.length < 4 ? (  
                  <div className="mt-2 flex">  
                    <input  
                      readOnly  
                      value={`${window.location.origin}?code=${mySquad.inviteCode}`}  
                      className="flex-1 bg-surface-800 border border-border-soft rounded-l-xl px-3 py-1.5 text-[10px] text-text-400 select-all outline-none"  
                    />  
                    <button  
                      type="button"  
                      onClick={() => {  
                        const inviteLink = `${window.location.origin}?code=${mySquad.inviteCode}`;
                        if (navigator.clipboard && window.isSecureContext) {
                          navigator.clipboard.writeText(inviteLink)
                            .then(() => alert("Invite link copied to clipboard!"))
                            .catch(() => fallbackCopyText(inviteLink));
                        } else {
                          fallbackCopyText(inviteLink);
                        }
                      }}  
                      className="bg-primary-500 hover:bg-primary-400 px-3 rounded-r-xl text-[10px] font-bold text-text-100 transition-all shrink-0"  
                    >  
                      Copy Link  
                    </button>  
                  </div>  
                ) : (  
                  <p className="text-[10px] text-primary-400 italic text-center mt-1">Squad is fully populated!</p>  
                )}  
              </div>  
            ) : (  
              /* Onboarding Actions Panel */  
              <SquadOnboarding currentUser={currentUser} currentUserStats={currentUserStats} db={db} appId={appId} activeUserId={activeUserId} />  
            )}

            {/* Squad Leaderboard Feed */}  
            <div className="space-y-2 border-t border-border-soft pt-3">  
              <h4 className="text-[10px] font-bold text-text-500 tracking-wider uppercase mb-2">Top Active Squads</h4>  
              {leaderboardData.length === 0 ? (
                <div className="py-8 text-center text-text-500 text-xs border border-dashed border-border-soft rounded-xl">
                  No active squads found.
                </div>
              ) : (
                leaderboardData.map((squad, idx) => (  
                  <div   
                    key={squad.id}   
                    className={`flex justify-between items-center p-2.5 rounded-xl border ${  
                      squad.id === mySquad?.id ? 'bg-primary-500/10 border-primary-500/40' : 'bg-surface-700 border-border-soft'  
                    }`}  
                  >  
                    <div className="flex items-center space-x-3">  
                      <span className="text-[10px] text-text-500 font-bold font-mono">#{idx + 1}</span>  
                      <span className="text-xs font-bold text-text-100">{squad.name}</span>  
                    </div>  
                    <p className="text-xs font-mono font-bold text-primary-300">{(squad.averageEmissions || 0).toFixed(2)} avg kg</p>  
                  </div>  
                ))
              )}  
            </div>  
          </div>  
        )}  
      </div>

      {/* Ripple Effect card integrated */}
      <div className="mt-4 pt-4 border-t border-border-soft bg-primary-500/5 rounded-xl p-3 text-center shrink-0">
        <h4 className="text-[10px] text-primary-300 font-bold uppercase tracking-widest font-sans">The Ripple Effect</h4>
        <p className="text-xs text-text-300 mt-1">
          If all <span className="font-bold text-amber-500">{leaderboardData.length || 1} members</span> adopted your active footprint,
          we would prevent <span className="font-bold text-amber-500">{( (leaderboardData.length || 1) * 2.4).toFixed(1)} kg CO2e</span> this week.
        </p>
      </div>  
    </div>  
  );  
}

// Fallback Copy Function using textarea mechanism for iframe sandboxes
function fallbackCopyText(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    alert("Invite link copied to clipboard!");
  } catch (err) {
    console.error("Secure copy fell back unsuccessfully", err);
  }
  document.body.removeChild(textArea);
}

// Internal Sub-component to manage creation and referrals  
function SquadOnboarding({ currentUser, currentUserStats, db, appId, activeUserId }) {  
  const [squadName, setSquadName] = useState('');  
  const [inviteCode, setInviteCode] = useState('');  
  const [processing, setProcessing] = useState(false);

  // Dynamic Referral Parsing on Mount (Checks parameters: ?code=XYZ)  
  useEffect(() => {  
    const params = new URLSearchParams(window.location.search);  
    const code = params.get('code');  
    if (code) {  
      setInviteCode(code.toUpperCase());  
    }  
  }, []);

  const handleCreate = async () => {  
    if (!squadName.trim() || processing || !activeUserId) return;  
    setProcessing(true);  
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();  
    const newSquadId = crypto.randomUUID();

    try {  
      const squadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'squads', newSquadId);  
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserId);

      // 1. Create the Squad  
      await setDoc(squadDocRef, {  
        name: squadName.trim(),  
        inviteCode: generatedCode,  
        createdBy: activeUserId,  
        members: [activeUserId],  
        averageEmissions: currentUserStats?.weeklyEmissions || currentUserStats?.averageWeekly || 0,  
        createdAt: Date.now()  
      });

      // 2. Map squad reference onto creating user standings document  
      await updateDoc(userDocRef, {  
        squadId: newSquadId,  
        squadName: squadName.trim()  
      });  
        
    } catch (err) {  
      console.error("Create squad transactional failure:", err);  
    } finally {  
      setProcessing(false);  
    }  
  };

  const handleJoin = async (targetCode) => {  
    const finalCode = targetCode || inviteCode.trim().toUpperCase();  
    if (!finalCode || processing || !activeUserId) return;  
    setProcessing(true);

    try {  
      const squadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'squads');  
      const squadsSnap = await getDocs(squadsRef);  
      let targetSquad = null;

      squadsSnap.forEach((docSnap) => {  
        if (docSnap.data().inviteCode === finalCode) {  
          targetSquad = { id: docSnap.id, ...docSnap.data() };  
        }  
      });

      if (!targetSquad) {  
        alert("Referral squad key not found!");  
        setProcessing(false);  
        return;  
      }

      if (targetSquad.members.includes(activeUserId)) {  
        alert("You are already a member of this squad!");  
        setProcessing(false);  
        return;  
      }

      if (targetSquad.members.length >= 4) {  
        alert("This squad has reached its 4-member maximum capacity!");  
        setProcessing(false);  
        return;  
      }

      const squadDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'squads', targetSquad.id);  
      const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', activeUserId);

      // Add user to the member array  
      await updateDoc(squadDocRef, {  
        members: arrayUnion(activeUserId)  
      });

      // Bind squad details to user document  
      await updateDoc(userDocRef, {  
        squadId: targetSquad.id,  
        squadName: targetSquad.name  
      });

      // Recalculate dynamic footprint averages instantly  
      await updateSquadAggregatedEmissions(targetSquad.id, db, appId);

    } catch (err) {  
      console.error("Join squad process aborted:", err);  
    } finally {  
      setProcessing(false);  
    }  
  };

  return (  
    <div className="space-y-4 bg-bg-900 p-4 rounded-xl border border-border-soft">  
      <p className="text-[10px] text-text-500 leading-normal text-center font-medium">  
        Create an elite squad or enter a referral invitation code to aggregate and compete on carbon emissions.  
      </p>  
        
      {/* Create Block */}  
      <div className="space-y-2 pt-1">  
        <input   
          placeholder="ENTER NEW SQUAD NAME..."   
          value={squadName}   
          onChange={e => setSquadName(e.target.value)}  
          className="w-full bg-surface-700 border border-border-soft text-[10px] p-2 rounded-xl focus:border-primary-400 outline-none uppercase font-bold text-text-100 placeholder:text-text-500/50"  
        />  
        <button   
          type="button"   
          onClick={handleCreate}   
          disabled={processing || !squadName.trim()}  
          className="w-full bg-primary-500 hover:bg-primary-400 text-text-100 text-[10px] font-bold py-2 rounded-xl transition-all disabled:opacity-40"  
        >  
          {processing ? 'CREATING...' : 'CREATE SQUAD'}  
        </button>  
      </div>  

      <div className="relative flex py-1 items-center">  
        <div className="flex-grow border-t border-border-soft"></div>  
        <span className="flex-shrink mx-2 text-[9px] text-text-500 font-extrabold">OR</span>  
        <div className="flex-grow border-t border-border-soft"></div>  
      </div>  

      {/* Join Block */}  
      <div className="space-y-2">  
        <input   
          placeholder="ENTER CODE (E.G. SQUAD7)..."   
          value={inviteCode}   
          onChange={e => setInviteCode(e.target.value)}  
          className="w-full bg-surface-700 border border-border-soft text-[10px] p-2 rounded-xl focus:border-primary-400 outline-none uppercase font-bold text-text-100 placeholder:text-text-500/50"  
        />  
        <button   
          type="button"   
          onClick={() => handleJoin()}   
          disabled={processing || !inviteCode.trim()}  
          className="w-full bg-surface-800 hover:bg-surface-700 text-text-200 text-[10px] font-bold py-2 rounded-xl border border-border-soft transition-all disabled:opacity-40"  
        >  
          {processing ? 'JOINING...' : 'JOIN SQUAD'}  
        </button>  
      </div>  
    </div>  
  );  
}
