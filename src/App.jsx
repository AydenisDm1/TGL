import React, { useState, useEffect, useMemo, useCallback } from 'react';
// --- Firebase SDK Imports ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, writeBatch, getDocs, where, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// --- IMPORTANT: Firebase Configuration ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "your-api-key", authDomain: "your-auth-domain", projectId: "your-project-id" };

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-react-scoreboard';

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Icons (inline SVG for simplicity) ---
const PlusCircle = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>);
const Trash2 = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>);
const Users = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const Edit = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
const ChevronsUpDown = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>);
const Trophy = () => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);

// --- Initial Data for Seeding ---
const initialPlayersData = [
    { name: 'Robi' }, { name: 'Georgi K.' }, { name: 'Radi' }, { name: 'Niki' }, { name: 'Misho' },
    { name: 'Kalin' }, { name: 'Viho' }, { name: 'Silvestar' }, { name: 'Viksata' }, { name: 'Teo' }
];
const initialGamesData = [
    { player1: 'Georgi K.', player2: 'Misho', score1: 3, score2: 0, winner: 'Georgi K.' },
    { player1: 'Radi', player2: 'Georgi K.', score1: 3, score2: 1, winner: 'Radi' },
    { player1: 'Robi', player2: 'Misho', score1: 3, score2: 0, winner: 'Robi' },
    { player1: 'Robi', player2: 'Radi', score1: 3, score2: 1, winner: 'Robi' },
    { player1: 'Robi', player2: 'Georgi K.', score1: 0, score2: 3, winner: 'Georgi K.' },
    { player1: 'Misho', player2: 'Niki', score1: 3, score2: 1, winner: 'Misho' },
    { player1: 'Kalin', player2: 'Viho', score1: 2, score2: 3, winner: 'Viho' },
    { player1: 'Viksata', player2: 'Kalin', score1: 0, score2: 3, winner: 'Kalin' },
    { player1: 'Teo', player2: 'Kalin', score1: 0, score2: 3, winner: 'Kalin' },
    { player1: 'Viho', player2: 'Viksata', score1: 2, score2: 3, winner: 'Viksata' },
    { player1: 'Viksata', player2: 'Teo', score1: 3, score2: 1, winner: 'Viksata' }
];

// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  
  const [isModalOpen, setModalOpen] = useState({ addGame: false, playerManager: false, seasonManager: false });
  const [isGameLogVisible, setIsGameLogVisible] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- Authentication & Initial Load ---
  useEffect(() => {
    const authSub = onAuthStateChanged(auth, async (user) => {
      if (user && !isAuthReady) {
        setIsAuthReady(true);
      } else if (!user) {
        try {
          const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (token) await signInWithCustomToken(auth, token);
          else await signInAnonymously(auth);
        } catch (error) {
          console.error("Authentication failed:", error);
        }
      }
    });
    return () => authSub();
  }, [isAuthReady]);

  // --- Seasons Listener & Initial Seeding ---
  useEffect(() => {
    if (!isAuthReady) return;
    const seasonsQuery = query(collection(db, `artifacts/${appId}/public/data/seasons`), orderBy('createdAt', 'desc'));
    const seasonsSub = onSnapshot(seasonsQuery, (snapshot) => {
      const seasonsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setSeasons(seasonsData);
      const currentActive = seasonsData.find(s => s.isActive);
      if (currentActive) {
        setActiveSeason(currentActive);
        if (!selectedSeasonId) {
            setSelectedSeasonId(currentActive.id);
        }
      } else if (seasonsData.length === 0 && !snapshot.metadata.hasPendingWrites) {
        const startAndSeedFirstSeason = async () => {
            const newSeasonRef = doc(collection(db, `artifacts/${appId}/public/data/seasons`));
            await setDoc(newSeasonRef, { name: 'Season 1', isActive: true, createdAt: serverTimestamp() });
            const playersBatch = writeBatch(db);
            initialPlayersData.forEach(player => {
                const newPlayerRef = doc(collection(db, `artifacts/${appId}/public/data/seasons/${newSeasonRef.id}/players`));
                playersBatch.set(newPlayerRef, { ...player, manualPoints: 0, createdAt: serverTimestamp() });
            });
            await playersBatch.commit();
            const gamesBatch = writeBatch(db);
            initialGamesData.forEach(game => {
                const newGameRef = doc(collection(db, `artifacts/${appId}/public/data/seasons/${newSeasonRef.id}/games`));
                gamesBatch.set(newGameRef, { ...game, createdAt: serverTimestamp() });
            });
            await gamesBatch.commit();
        };
        startAndSeedFirstSeason();
      }
    });
    return () => seasonsSub();
  }, [isAuthReady, selectedSeasonId]);

  // --- Players & Games Listener (based on selected season) ---
  useEffect(() => {
    if (!selectedSeasonId) return;
    
    const playersQuery = query(collection(db, `artifacts/${appId}/public/data/seasons/${selectedSeasonId}/players`), orderBy('createdAt', 'asc'));
    const playersSub = onSnapshot(playersQuery, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    const gamesQuery = query(collection(db, `artifacts/${appId}/public/data/seasons/${selectedSeasonId}/games`), orderBy('createdAt', 'desc'));
    const gamesSub = onSnapshot(gamesQuery, (snapshot) => {
      setGames(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => {
      playersSub();
      gamesSub();
    };
  }, [selectedSeasonId]);

  // --- Memoized Leaderboard Calculation ---
  const leaderboardData = useMemo(() => {
    const stats = players.reduce((acc, player) => {
      acc[player.name] = { played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, points: 0, manualPoints: player.manualPoints || 0, id: player.id };
      return acc;
    }, {});

    games.forEach(game => {
      const { player1, player2, score1, score2, winner } = game;
      if (stats[player1]) {
        stats[player1].played++;
        stats[player1].setsWon += score1;
        stats[player1].setsLost += score2;
        if (winner === player1) {
          stats[player1].wins++;
          stats[player1].points += 3;
        } else {
          stats[player1].losses++;
        }
      }
      if (stats[player2]) {
        stats[player2].played++;
        stats[player2].setsWon += score2;
        stats[player2].setsLost += score1;
        if (winner === player2) {
          stats[player2].wins++;
          stats[player2].points += 3;
        } else {
          stats[player2].losses++;
        }
      }
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data, totalPoints: data.points + data.manualPoints, setsDifference: data.setsWon - data.setsLost }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.setsDifference - a.setsDifference || b.setsWon - a.setsWon);
  }, [players, games]);

  // --- Handlers ---
  const handleAddGame = useCallback(async (gameData) => {
    if (!activeSeason) return;
    await addDoc(collection(db, `artifacts/${appId}/public/data/seasons/${activeSeason.id}/games`), { ...gameData, createdAt: serverTimestamp() });
    setModalOpen(prev => ({...prev, addGame: false}));
  }, [activeSeason]);

  const handleDeleteGame = useCallback(async (gameId) => {
    if (!selectedSeasonId) return;
    await deleteDoc(doc(db, `artifacts/${appId}/public/data/seasons/${selectedSeasonId}/games`, gameId));
  }, [selectedSeasonId]);
  
  const handlePointAdjustment = useCallback(async (playerId, adjustment) => {
    if (!activeSeason) return;
    const playerRef = doc(db, `artifacts/${appId}/public/data/seasons/${activeSeason.id}/players`, playerId);
    const playerDoc = await getDoc(playerRef);
    const currentManualPoints = playerDoc.data().manualPoints || 0;
    await updateDoc(playerRef, { manualPoints: currentManualPoints + adjustment });
  }, [activeSeason]);

  const handleEndSeason = useCallback(async () => {
    if (!activeSeason) return;
    const batch = writeBatch(db);
    const seasonRef = doc(db, `artifacts/${appId}/public/data/seasons`, activeSeason.id);
    batch.update(seasonRef, { isActive: false });

    const newSeasonName = `Season ${seasons.length + 1}`;
    const newSeasonRef = doc(collection(db, `artifacts/${appId}/public/data/seasons`));
    batch.set(newSeasonRef, { name: newSeasonName, isActive: true, createdAt: serverTimestamp() });
    
    const oldPlayersCollectionRef = collection(db, `artifacts/${appId}/public/data/seasons/${activeSeason.id}/players`);
    const oldPlayersSnapshot = await getDocs(oldPlayersCollectionRef);
    
    oldPlayersSnapshot.forEach(playerDoc => {
        const newPlayerRef = doc(collection(db, `artifacts/${appId}/public/data/seasons/${newSeasonRef.id}/players`));
        const playerData = playerDoc.data();
        batch.set(newPlayerRef, { name: playerData.name, manualPoints: 0, createdAt: serverTimestamp() });
    });

    await batch.commit();
    setModalOpen(prev => ({...prev, seasonManager: false}));
  }, [activeSeason, seasons]);

  const isCurrentSeasonSelected = activeSeason?.id === selectedSeasonId;

  return (
    <div className="bg-slate-900 min-h-screen text-slate-200 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header />
        
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                <SeasonSelector seasons={seasons} selectedSeasonId={selectedSeasonId} setSelectedSeasonId={setSelectedSeasonId} />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setModalOpen(prev => ({...prev, seasonManager: true}))} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md"><Trophy /><span>Manage Seasons</span></button>
              <button onClick={() => setModalOpen(prev => ({...prev, playerManager: true}))} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-md"><Users /><span>Players</span></button>
              <button onClick={() => setModalOpen(prev => ({...prev, addGame: true}))} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-blue-500/20" disabled={!isCurrentSeasonSelected}><PlusCircle /><span>Add Game</span></button>
            </div>
          </div>
        <LeaderboardTable data={leaderboardData} onPointAdjustment={handlePointAdjustment} isLive={isCurrentSeasonSelected} />

        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Game Log</h2>
                <button onClick={() => setIsGameLogVisible(!isGameLogVisible)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    {isGameLogVisible ? 'Hide' : 'Show'} Log
                </button>
            </div>
            {isGameLogVisible && <GameLog games={games} onDeleteGame={handleDeleteGame} isLive={isCurrentSeasonSelected} />}
        </div>
      </div>

      {isModalOpen.addGame && <ModalBase onClose={() => setModalOpen(prev => ({...prev, addGame: false}))}><AddGameModal players={players.map(p => p.name)} onAddGame={handleAddGame} onClose={() => setModalOpen(prev => ({...prev, addGame: false}))} /></ModalBase>}
      {isModalOpen.playerManager && <ModalBase onClose={() => setModalOpen(prev => ({...prev, playerManager: false}))}><PlayerManager players={players} seasonId={activeSeason?.id} isLive={isCurrentSeasonSelected} onClose={() => setModalOpen(prev => ({...prev, playerManager: false}))} /></ModalBase>}
      {isModalOpen.seasonManager && <ModalBase onClose={() => setModalOpen(prev => ({...prev, seasonManager: false}))}><SeasonManager onEndSeason={handleEndSeason} onClose={() => setModalOpen(prev => ({...prev, seasonManager: false}))} /></ModalBase>}
    </div>
  );
}

// --- Sub-components ---
const Header = () => (<header className="text-center"><h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">TIGER LEAGUE</h1><p className="text-slate-400 mt-2">A shared, real-time scoreboard for you and your friends.</p></header>);

const SeasonSelector = ({ seasons, selectedSeasonId, setSelectedSeasonId }) => (
    <div className="relative">
        <select value={selectedSeasonId || ''} onChange={(e) => setSelectedSeasonId(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md py-2 pl-3 pr-8 text-white appearance-none focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}{s.isActive ? ' (Live)' : ''}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"><ChevronsUpDown /></div>
    </div>
);

const LeaderboardTable = ({ data, onPointAdjustment, isLive }) => (<div className="overflow-x-auto bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg"><table className="w-full text-left table-fixed"><thead className="border-b border-slate-700 text-sm uppercase text-slate-400"><tr><th className="px-4 py-4 w-16">Rank</th><th className="px-4 py-4 w-auto">Player</th><th className="px-4 py-4 w-20 text-center">P</th><th className="px-4 py-4 w-20 text-center">W</th><th className="px-4 py-4 w-20 text-center">L</th><th className="px-4 py-4 w-20 text-center">SW</th><th className="px-4 py-4 w-20 text-center">SL</th><th className="px-4 py-4 w-32 text-center">+/-</th><th className="px-4 py-4 w-24 text-center">Total Pts</th></tr></thead><tbody>{data.map((player, index) => (<tr key={player.name} className="border-b border-slate-800 hover:bg-slate-700/50 transition-colors duration-200"><td className="px-4 py-4 font-bold text-lg">{index + 1}</td><td className="px-4 py-4 font-semibold text-white truncate">{player.name}</td><td className="px-4 py-4 text-center">{player.played}</td><td className="px-4 py-4 text-center text-green-400">{player.wins}</td><td className="px-4 py-4 text-center text-red-400">{player.losses}</td><td className="px-4 py-4 text-center text-green-400/80">{player.setsWon}</td><td className="px-4 py-4 text-center text-red-400/80">{player.setsLost}</td><td className="px-4 py-4 text-center"><div className="flex items-center justify-center gap-2 transition-opacity duration-300"><button onClick={() => onPointAdjustment(player.id, -1)} className={`bg-red-500/50 h-6 w-6 rounded-full transition-opacity ${isLive ? 'opacity-100' : 'opacity-0'}`} disabled={!isLive}>-</button><span className={`w-8 ${player.manualPoints !== 0 ? 'font-bold' : ''}`}>{player.manualPoints > 0 ? `+${player.manualPoints}` : player.manualPoints}</span><button onClick={() => onPointAdjustment(player.id, 1)} className={`bg-green-500/50 h-6 w-6 rounded-full transition-opacity ${isLive ? 'opacity-100' : 'opacity-0'}`} disabled={!isLive}>+</button></div></td><td className="px-4 py-4 text-center font-bold text-blue-400 text-lg">{player.totalPoints}</td></tr>))}</tbody></table></div>);

const GameLog = ({ games, onDeleteGame, isLive }) => (<div className="bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4 space-y-3">{games.length === 0 ? (<p className="text-slate-400 text-center py-4">No games have been played yet.</p>) : (games.map(game => (<div key={game.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg hover:bg-slate-700/50 transition-colors duration-200"><div className="flex-grow"><span className={game.winner === game.player1 ? 'font-bold text-green-400' : ''}>{game.player1}</span><span className="text-slate-400 mx-2">vs</span><span className={game.winner === game.player2 ? 'font-bold text-green-400' : ''}>{game.player2}</span></div><div className="font-mono text-lg text-white mr-4">{game.score1} - {game.score2}</div><button onClick={() => onDeleteGame(game.id)} className={`text-slate-500 hover:text-red-400 transition-opacity p-1 ${isLive ? 'opacity-100' : 'opacity-0'}`} disabled={!isLive} aria-label="Delete game"><Trash2 /></button></div>)))}</div>);

const ModalBase = ({ children, onClose }) => {
    const [show, setShow] = useState(false);
    useEffect(() => { setShow(true); }, []);
    const handleClose = () => { setShow(false); setTimeout(onClose, 300); };
    return (<div onClick={handleClose} className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}><div onClick={(e) => e.stopPropagation()} className={`bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>{children}</div></div>);
};

const AddGameModal = ({ players, onAddGame, onClose }) => {
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [error, setError] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); setError(''); if (!player1 || !player2) { setError('Please select both players.'); return; } if (player1 === player2) { setError('Players cannot be the same.'); return; } const s1 = Number(score1); const s2 = Number(score2); if (s1 < 0 || s2 < 0) { setError('Scores cannot be negative.'); return; } if (s1 === s2) { setError('Scores cannot be the same, please select a winner.'); return; } onAddGame({ player1, player2, score1: s1, score2: s2, winner: s1 > s2 ? player1 : player2 }); };
  return (<><div className="flex justify-between items-center p-4 border-b border-slate-700"><h3 className="text-xl font-bold">Add New Game Result</h3><button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button></div><form onSubmit={handleSubmit} className="p-6 space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1 text-slate-400">Player 1</label><select value={player1} onChange={(e) => setPlayer1(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"><option value="">Select Player</option>{players.filter(p => p !== player2).map(p => <option key={p} value={p}>{p}</option>)}</select></div><div><label className="block text-sm font-medium mb-1 text-slate-400">Player 2</label><select value={player2} onChange={(e) => setPlayer2(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"><option value="">Select Player</option>{players.filter(p => p !== player1).map(p => <option key={p} value={p}>{p}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1 text-slate-400">P1 Score</label><input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div><div><label className="block text-sm font-medium mb-1 text-slate-400">P2 Score</label><input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" /></div></div>{error && <p className="text-red-400 text-sm">{error}</p>}<div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Cancel</button><button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Save Result</button></div></form></>);
};

const PlayerManager = ({ players, seasonId, isLive, onClose }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState({ id: null, name: '' });
  const handleAddPlayer = useCallback(async (e) => { e.preventDefault(); if (!seasonId || !newPlayerName.trim()) return; await addDoc(collection(db, `artifacts/${appId}/public/data/seasons/${seasonId}/players`), { name: newPlayerName.trim(), manualPoints: 0, createdAt: serverTimestamp() }); setNewPlayerName(''); }, [seasonId, newPlayerName]);
  const handleUpdatePlayer = useCallback(async () => { if (!seasonId || !editingPlayer.id || !editingPlayer.name.trim()) return; const oldPlayer = players.find(p => p.id === editingPlayer.id); if (!oldPlayer || oldPlayer.name === editingPlayer.name.trim()) { setEditingPlayer({id: null, name: ''}); return; } const batch = writeBatch(db); const newName = editingPlayer.name.trim(); const playerRef = doc(db, `artifacts/${appId}/public/data/seasons/${seasonId}/players`, editingPlayer.id); batch.update(playerRef, { name: newName }); const gamesCollectionRef = collection(db, `artifacts/${appId}/public/data/seasons/${seasonId}/games`); const q1 = query(gamesCollectionRef, where("player1", "==", oldPlayer.name)); const q2 = query(gamesCollectionRef, where("player2", "==", oldPlayer.name)); try { const [gamesAsP1, gamesAsP2] = await Promise.all([getDocs(q1), getDocs(q2)]); gamesAsP1.forEach(gameDoc => { const updateData = { player1: newName }; if (gameDoc.data().winner === oldPlayer.name) updateData.winner = newName; batch.update(gameDoc.ref, updateData); }); gamesAsP2.forEach(gameDoc => { const updateData = { player2: newName }; if (gameDoc.data().winner === oldPlayer.name) updateData.winner = newName; batch.update(gameDoc.ref, updateData); }); await batch.commit(); } catch (error) { console.error("Error updating player name in games:", error); } setEditingPlayer({id: null, name: ''}); }, [seasonId, editingPlayer, players]);
  const handleDeletePlayer = useCallback(async (playerId, playerName) => { if (!seasonId) return; const batch = writeBatch(db); const playerRef = doc(db, `artifacts/${appId}/public/data/seasons/${seasonId}/players`, playerId); batch.delete(playerRef); const gamesCollectionRef = collection(db, `artifacts/${appId}/public/data/seasons/${seasonId}/games`); const q1 = query(gamesCollectionRef, where("player1", "==", playerName)); const q2 = query(gamesCollectionRef, where("player2", "==", playerName)); try { const [gamesAsP1, gamesAsP2] = await Promise.all([getDocs(q1), getDocs(q2)]); gamesAsP1.forEach(doc => batch.delete(doc.ref)); gamesAsP2.forEach(doc => batch.delete(doc.ref)); await batch.commit(); } catch (error) { console.error("Error deleting player and their games:", error); } }, [seasonId]);
  return (<><div className="flex justify-between items-center p-4 border-b border-slate-700"><h3 className="text-xl font-bold">Manage Players</h3><button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button></div><div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">{isLive && <form onSubmit={handleAddPlayer} className="flex gap-2"><input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="New player name" className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2" required /><button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Add</button></form>}<div className="space-y-2">{players.map(player => (<div key={player.id} className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">{editingPlayer.id === player.id ? (<input type="text" value={editingPlayer.name} onChange={(e) => setEditingPlayer(prev => ({...prev, name: e.target.value}))} className="flex-grow bg-slate-600 p-1 rounded-md" />) : (<span className="font-medium">{player.name}</span>)}<div className="flex items-center gap-2">{isLive && (editingPlayer.id === player.id ? (<button onClick={handleUpdatePlayer} className="bg-green-500 py-1 px-3 rounded-lg">Save</button>) : (<button onClick={() => setEditingPlayer({id: player.id, name: player.name})} className="p-1"><Edit /></button>))}<button onClick={() => handleDeletePlayer(player.id, player.name)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 /></button></div></div>))}</div></div></>);
};

const SeasonManager = ({ onEndSeason, onClose }) => {
    return (<><div className="flex justify-between items-center p-4 border-b border-slate-700"><h3 className="text-xl font-bold">Manage Seasons</h3><button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button></div><div className="p-6 space-y-4"><p className="text-slate-300">Ending the current season will archive its stats and start a fresh one with the same players. This action cannot be undone.</p><button onClick={onEndSeason} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">End Current Season & Start New</button></div></>);
};
