
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Flame, Clock, DollarSign, Package, Play, 
  RotateCcw, AlertCircle, Heart, TrendingUp, TrendingDown, 
  Truck, Star, Volume2, VolumeX, XCircle, Trash2, Skull
} from 'lucide-react';
import { INGREDIENTS, RECIPES, INITIAL_MONEY, GAME_DURATION, STOVE_COUNT } from './constants';
import { IngredientId, GameState, Recipe, Order, Stove, PendingDelivery, CustomerType } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    money: INITIAL_MONEY,
    inventory: { tomato: 0, lettuce: 0, onion: 0, meat: 0, bread: 0, cheese: 0, potato: 0 },
    stoves: Array(STOVE_COUNT).fill(null).map((_, i) => ({ id: i, isCooking: false, dishId: null, timeRemaining: 0, progress: 0 })),
    activeOrders: [],
    pendingDeliveries: [],
    totalRevenue: 0,
    popularity: 100,
    timeLeft: GAME_DURATION,
    gameStatus: 'idle'
  });

  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'neutral'} | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [flashingIngredients, setFlashingIngredients] = useState<IngredientId[]>([]);
  const timerRef = useRef<number | null>(null);
  
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxBuy = useRef<HTMLAudioElement | null>(null);
  const sfxCook = useRef<HTMLAudioElement | null>(null);
  const sfxSuccess = useRef<HTMLAudioElement | null>(null);
  const sfxFail = useRef<HTMLAudioElement | null>(null);
  const sfxClick = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgmRef.current = new Audio('https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3');
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.2;

    const workSoundUrl = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';
    sfxBuy.current = new Audio(workSoundUrl);
    sfxCook.current = new Audio(workSoundUrl);
    sfxClick.current = new Audio(workSoundUrl);
    
    sfxSuccess.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    sfxSuccess.current.volume = 0.5;
    
    sfxFail.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3');
    sfxFail.current.volume = 0.7;

    return () => {
      bgmRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
  }, [isMuted]);

  const playSfx = (audio: HTMLAudioElement | null) => {
    if (isMuted || !audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {}); 
  };

  const notify = (msg: string, type: 'success' | 'error' | 'neutral' = 'neutral') => {
    setNotification({ msg, type });
    if (type === 'success') playSfx(sfxSuccess.current);
    if (type === 'error') playSfx(sfxFail.current);
    setTimeout(() => setNotification(null), 2000);
  };

  const createNewOrder = (): Order => {
    const randomRecipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const roll = Math.random();
    let type: CustomerType = 'normal';
    if (roll < 0.15) type = 'blogger';
    else if (roll < 0.30) type = 'grumpy';
    else if (roll < 0.45) type = 'happy';
    
    const expiry = 45 + Math.floor(Math.random() * 25);
    return {
      id: Math.random().toString(36).substr(2, 9),
      dishId: randomRecipe.id,
      expiryTime: expiry,
      maxTime: expiry,
      type
    };
  };

  const startGame = () => {
    playSfx(sfxClick.current);
    bgmRef.current?.play().catch(() => {});
    setState({
      money: INITIAL_MONEY,
      inventory: { tomato: 0, lettuce: 0, onion: 0, meat: 0, bread: 0, cheese: 0, potato: 0 },
      stoves: Array(STOVE_COUNT).fill(null).map((_, i) => ({ id: i, isCooking: false, dishId: null, timeRemaining: 0, progress: 0 })),
      activeOrders: [createNewOrder(), createNewOrder(), createNewOrder()],
      pendingDeliveries: [],
      totalRevenue: 0,
      popularity: 100,
      timeLeft: GAME_DURATION,
      gameStatus: 'playing'
    });
  };

  const buyIngredient = (id: IngredientId) => {
    const item = INGREDIENTS[id];
    const pendingCount = state.pendingDeliveries.filter(d => d.ingredientId === id).length;
    const currentTotal = state.inventory[id] + pendingCount;

    if (currentTotal >= 10) {
      return notify(`${item.name} 仓库已满!`, 'error');
    }

    if (state.money >= item.price) {
      playSfx(sfxBuy.current);
      const deliveryId = Math.random().toString(36).substr(2, 5);
      setState(prev => ({
        ...prev,
        money: prev.money - item.price,
        pendingDeliveries: [...prev.pendingDeliveries, { id: deliveryId, ingredientId: id, timeLeft: item.deliveryTime }]
      }));
    } else {
      notify("余额不足!", 'error');
    }
  };

  const startCooking = (recipe: Recipe) => {
    const missing = Object.entries(recipe.ingredients)
      .filter(([ingId, count]) => state.inventory[ingId as IngredientId] < (count || 0))
      .map(([ingId]) => ingId as IngredientId);

    if (missing.length > 0) {
      setFlashingIngredients(missing);
      setTimeout(() => setFlashingIngredients([]), 1500);
      return notify("食材短缺!", 'error');
    }

    const freeStoveIndex = state.stoves.findIndex(s => !s.isCooking);
    if (freeStoveIndex === -1) return notify("灶台全满!", 'error');

    playSfx(sfxCook.current);
    const newInventory = { ...state.inventory };
    Object.entries(recipe.ingredients).forEach(([ingId, count]) => { newInventory[ingId as IngredientId] -= (count || 0); });
    const newStoves = [...state.stoves];
    newStoves[freeStoveIndex] = { ...newStoves[freeStoveIndex], isCooking: true, dishId: recipe.id, timeRemaining: recipe.cookingTime, progress: 0 };
    setState(prev => ({ ...prev, inventory: newInventory, stoves: newStoves }));
  };

  const cancelCooking = (stoveId: number) => {
    playSfx(sfxClick.current);
    const newStoves = state.stoves.map(s => {
      if (s.id === stoveId && s.isCooking) {
        return { ...s, isCooking: false, dishId: null, progress: 0, timeRemaining: 0 };
      }
      return s;
    });
    setState(prev => ({ ...prev, stoves: newStoves }));
  };

  useEffect(() => {
    if (state.gameStatus !== 'playing') return;
    timerRef.current = window.setInterval(() => {
      setState(prev => {
        if (prev.timeLeft <= 0 || prev.popularity <= 0 || prev.money <= 0) { 
          clearInterval(timerRef.current!); 
          bgmRef.current?.pause();
          return { ...prev, gameStatus: 'ended', timeLeft: Math.max(0, prev.timeLeft) }; 
        }

        const newInventory = { ...prev.inventory };
        const stillPending: PendingDelivery[] = [];

        prev.pendingDeliveries.forEach(d => {
          if (d.timeLeft <= 1) { 
            if (newInventory[d.ingredientId] < 10) {
              newInventory[d.ingredientId]++; 
            }
          }
          else stillPending.push({ ...d, timeLeft: d.timeLeft - 1 });
        });

        const updatedStoves = prev.stoves.map(s => {
          if (!s.isCooking) return s;
          const recipe = RECIPES.find(r => r.id === s.dishId)!;
          const newTime = Math.max(0, s.timeRemaining - 1);
          return { ...s, timeRemaining: newTime, progress: ((recipe.cookingTime - newTime) / recipe.cookingTime) * 100 };
        });

        let newRevenue = prev.totalRevenue;
        let newPopularity = prev.popularity;
        let currentMoney = prev.money;
        let currentOrders = [...prev.activeOrders];

        const finalStoves = updatedStoves.map(s => {
          if (s.isCooking && s.timeRemaining === 0) {
            const recipe = RECIPES.find(r => r.id === s.dishId)!;
            const orderIndex = currentOrders.findIndex(o => o.dishId === recipe.id);
            if (orderIndex !== -1) {
              const order = currentOrders[orderIndex];
              let popGain = 1;
              let tip = 0;
              if (order.type === 'blogger') { popGain = 15; }
              if (order.type === 'happy') { popGain = 10; tip = 20; }
              newRevenue += recipe.salePrice + tip;
              currentMoney += recipe.salePrice + tip;
              newPopularity = Math.min(100, newPopularity + popGain);
              currentOrders.splice(orderIndex, 1);
              notify(`卖出: ${recipe.name}!`, 'success');
            }
            return { ...s, isCooking: false, dishId: null, progress: 0 };
          }
          return s;
        });

        const expired = currentOrders.filter(o => o.expiryTime <= 1);
        expired.forEach(o => {
          let popLoss = 5;
          if (o.type === 'blogger') { popLoss = 30; }
          if (o.type === 'grumpy') { popLoss = 20; }
          newPopularity = Math.max(0, newPopularity - popLoss);
          notify("订单过期!", "error");
        });

        const remainingOrders = currentOrders.map(o => ({ ...o, expiryTime: o.expiryTime - 1 })).filter(o => o.expiryTime > 0);
        if (remainingOrders.length < 5 && Math.random() < 0.12) remainingOrders.push(createNewOrder());

        return {
          ...prev, 
          timeLeft: prev.timeLeft - 1, 
          stoves: finalStoves, 
          money: currentMoney, 
          totalRevenue: newRevenue, 
          popularity: newPopularity, 
          activeOrders: remainingOrders,
          pendingDeliveries: stillPending, 
          inventory: newInventory
        };
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [state.gameStatus]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (state.gameStatus === 'idle' || state.gameStatus === 'ended') {
    const isBankrupt = state.gameStatus === 'ended' && (state.popularity <= 0 || state.money <= 0);
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-1000 ${isBankrupt ? 'bg-red-950' : 'bg-orange-50'}`}>
        <div className={`max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-6 text-center border-2 ${isBankrupt ? 'border-red-600' : 'border-orange-200'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${isBankrupt ? 'bg-red-100' : 'bg-orange-100'}`}>
            {state.gameStatus === 'idle' ? <Flame className="w-8 h-8 text-orange-600" /> : isBankrupt ? <Skull className="w-8 h-8 text-red-600 animate-pulse" /> : <TrendingUp className="w-8 h-8 text-green-600" />}
          </div>
          <h1 className="text-2xl font-black text-stone-800 mb-4 uppercase tracking-tighter">Kitchen Master</h1>
          
          {state.gameStatus === 'ended' && (
            <div className="mb-4 p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
              <div className="text-4xl font-black text-orange-600 mb-1">${state.money.toFixed(0)}</div>
              <div className="text-stone-400 font-bold uppercase text-[10px] mb-2">最终资金</div>
              <div className="flex justify-around items-center pt-2 border-t border-stone-200/50">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-red-500">{state.popularity}%</span>
                  <span className="text-[8px] uppercase font-bold text-stone-400">口碑</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-black text-green-500">${state.totalRevenue.toFixed(0)}</span>
                  <span className="text-[8px] uppercase font-bold text-stone-400">总收入</span>
                </div>
              </div>
            </div>
          )}
          
          <button onClick={startGame} className={`w-full text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-md active:translate-y-[4px] active:shadow-none ${isBankrupt ? 'bg-stone-900 hover:bg-black shadow-[0_4px_0_#000]' : 'bg-orange-600 hover:bg-orange-700 shadow-[0_4px_0_#9a3412]'}`}>
            <Play className="w-5 h-5 fill-current" /> {state.gameStatus === 'idle' ? '开始经营' : '重新开始'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-100 flex flex-col font-sans overflow-hidden select-none">
      <style>{`
        @keyframes flash-red {
          0%, 100% { border-color: #ef4444; background-color: #fee2e2; }
          50% { border-color: #ef4444; background-color: white; }
        }
        .animate-flash-red { animation: flash-red 0.5s ease-in-out 3; z-index: 10; }
        /* 极致压缩行高以适配 7 种食材一屏显示 */
        .supply-row { height: 36px; }
        .recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
      `}</style>
      
      <header className="bg-white border-b-2 border-stone-200 px-4 py-1 flex items-center justify-between shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xl font-black text-green-700 tabular-nums">${state.money.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
             <Heart className={`w-4 h-4 ${state.popularity < 30 ? 'text-red-600 animate-pulse' : 'text-red-500'}`} fill="currentColor" />
             <span className="text-lg font-black text-red-700">{state.popularity}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-200">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className={`flex items-center gap-1.5 px-4 py-1 rounded-full border transition-all ${state.timeLeft < 30 ? 'bg-red-600 text-white animate-pulse border-white' : 'bg-stone-800 text-white border-stone-700'}`}>
            <Clock className="w-4 h-4" />
            <span className="text-xl font-black tabular-nums">{formatTime(state.timeLeft)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-1 grid grid-cols-12 gap-1 overflow-hidden">
        {/* Supply Chain Section (Left) - Non-scrollable optimization */}
        <section className="col-span-3 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="bg-stone-700 px-2 py-1 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-1"><ShoppingCart className="w-3 h-3 text-blue-300" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">进货</h2></div>
            <div className="flex items-center gap-1"><Package className="w-3 h-3 text-orange-300" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">仓库</h2></div>
          </div>
          <div className="flex-1 p-0.5 space-y-px bg-stone-50/30 overflow-hidden">
            {(Object.keys(INGREDIENTS) as IngredientId[]).map(id => {
              const ing = INGREDIENTS[id];
              const pendingItems = state.pendingDeliveries.filter(d => d.ingredientId === id);
              const currentTotal = state.inventory[id] + pendingItems.length;
              const isFull = currentTotal >= 10;
              const isLowMoney = state.money < ing.price;
              return (
                <div key={id} className="supply-row flex gap-1">
                  <div className="w-12 flex flex-col gap-0.5">
                    <button onClick={() => buyIngredient(id)} disabled={isLowMoney || isFull} className={`relative w-full h-[26px] flex items-center justify-between px-1 rounded-md border transition-all bg-white shadow-sm ${!isFull && !isLowMoney ? 'border-stone-100 hover:border-blue-400' : 'border-stone-100 opacity-60 cursor-not-allowed'}`}>
                      <span className="text-lg leading-none">{ing.icon}</span>
                      <span className={`font-black text-[7px] ${isLowMoney ? 'text-stone-300' : 'text-blue-600'}`}>${ing.price}</span>
                    </button>
                    <div className="h-0.5 flex gap-0.5 px-0.5">{pendingItems.map(d => (<div key={d.id} className="flex-1 h-full bg-stone-200 rounded-full overflow-hidden relative"><div className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${((ing.deliveryTime - d.timeLeft) / ing.deliveryTime) * 100}%` }} /></div>))}</div>
                  </div>
                  <div className={`flex-1 p-0.5 rounded-lg bg-white border transition-all shadow-sm flex items-center h-[26px] mt-0 ${flashingIngredients.includes(id) ? 'animate-flash-red border-red-500' : 'border-stone-100'}`}>
                    <div className="flex-1 grid grid-cols-10 gap-0.5 p-0.5 bg-stone-50/50 rounded-md h-full">
                      {Array.from({ length: 10 }).map((_, i) => (<div key={i} className={`flex items-center justify-center rounded-sm border ${i < state.inventory[id] ? 'bg-white border-stone-50' : 'border-dashed border-stone-100/10'}`}>{i < state.inventory[id] && <span className="text-[10px] leading-none">{ing.icon}</span>}</div>))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Menu & Kitchen Section (Center) */}
        <div className="col-span-6 flex flex-col gap-1 overflow-hidden">
          {/* Menu Section */}
          <section className="h-[75%] bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-orange-600 px-3 py-1 flex items-center gap-2 text-white shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              <h2 className="text-[10px] font-black uppercase tracking-wider text-white">菜谱选择</h2>
            </div>
            <div className="p-1 recipe-grid overflow-y-auto flex-1 bg-stone-100/10">
              {RECIPES.map(recipe => {
                const canCook = Object.entries(recipe.ingredients).every(([ingId, count]) => state.inventory[ingId as IngredientId] >= (count || 0));
                return (
                  <button 
                    key={recipe.id} 
                    onClick={() => startCooking(recipe)} 
                    className={`flex flex-col p-1.5 rounded-xl border-2 transition-all relative active:scale-95 bg-white shadow-sm overflow-hidden group ${canCook ? 'border-orange-50 hover:border-orange-400' : 'border-transparent opacity-60 grayscale-[40%]'}`}
                  >
                    <div className="flex flex-col items-center mb-1 text-center">
                      <div className="text-3xl mb-0.5 group-hover:scale-110 transition-transform drop-shadow-sm">{recipe.icon}</div>
                      <div className="font-black text-stone-800 text-[10px] uppercase truncate leading-none w-full">{recipe.name}</div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 w-full">
                       <div className="flex gap-0.5 justify-center flex-wrap">
                          {Object.entries(recipe.ingredients).map(([id, count]) => (
                            <div key={id} className={`flex items-center text-[8px] font-bold ${state.inventory[id as IngredientId] < (count || 0) ? 'text-red-400' : 'text-stone-400'}`}>
                              {INGREDIENTS[id as IngredientId].icon}{count}
                            </div>
                          ))}
                       </div>
                       <div className={`mt-auto text-[9px] font-black text-center py-0.5 rounded shadow-inner ${canCook ? 'bg-green-500 text-white' : 'bg-stone-200 text-stone-400'}`}>${recipe.salePrice}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Cooking Section */}
          <section className="h-[25%] bg-white rounded-xl shadow-sm border border-stone-200 px-2 py-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1 shrink-0 font-black text-stone-400 uppercase tracking-widest text-[8px]">
              <Flame className="w-2.5 h-2.5 text-orange-500" /> 操作间
            </div>
            <div className="flex-1 flex gap-2">
              {state.stoves.map(stove => {
                const activeRecipe = RECIPES.find(r => r.id === stove.dishId);
                return (
                  <div key={stove.id} className="flex-1 relative px-2 py-1 rounded-lg border border-stone-100 bg-stone-50/50 flex items-center shadow-inner group overflow-hidden">
                    {stove.isCooking ? (
                      <div className="w-full flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-200">
                        <button onClick={() => cancelCooking(stove.id)} className="p-0.5 text-red-400 hover:bg-red-50 rounded-full transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                        <div className="text-2xl shrink-0">{activeRecipe?.icon}</div>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="flex justify-between items-center px-1">
                             <span className="text-[8px] font-black uppercase text-stone-400 truncate max-w-[50px]">{activeRecipe?.name}</span>
                             <span className="bg-orange-600 text-white px-1 rounded-sm font-black text-[8px] shadow-sm animate-pulse">{stove.timeRemaining}s</span>
                          </div>
                          <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden border border-white">
                            <div className="bg-gradient-to-r from-orange-400 to-red-600 h-full" style={{ width: `${stove.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full text-center opacity-10 text-[7px] font-black uppercase tracking-widest flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> 就绪</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Orders Section (Right) */}
        <div className="col-span-3 flex flex-col gap-1 overflow-hidden">
          <section className="flex-1 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-red-500 px-2 py-1 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">订单</h2></div>
              <span className="bg-white/20 text-[8px] px-1.5 rounded-full font-black">{state.activeOrders.length}</span>
            </div>
            <div className="p-1 space-y-1 flex-1 overflow-y-auto bg-stone-100/10">
              {state.activeOrders.map(order => {
                const recipe = RECIPES.find(r => r.id === order.dishId)!;
                const isCritical = order.expiryTime < 15;
                const progressWidth = (order.expiryTime / order.maxTime) * 100;
                return (
                  <div key={order.id} className={`flex flex-col p-1.5 rounded-lg border transition-all shadow-sm bg-white ${isCritical ? 'border-red-400 animate-pulse' : 'border-stone-50'}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="text-2xl shrink-0">{recipe.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-stone-800 text-[9px] leading-tight truncate">{recipe.name}</div>
                        <div className="flex items-center justify-between text-[7px] font-black uppercase">
                           <span className={isCritical ? 'text-red-600 font-bold' : 'text-stone-400'}>{order.expiryTime}s</span>
                           <span className={order.type === 'blogger' ? 'text-purple-500' : 'text-stone-300'}>{order.type === 'blogger' ? '博主' : '普通'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-stone-100 h-1 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ease-linear ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${progressWidth}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Center Popup Notifications */}
      {notification && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-3xl shadow-xl flex flex-col items-center gap-2 animate-in zoom-in fade-in duration-300 z-[200] border-4 backdrop-blur-md ${notification.type === 'success' ? 'bg-green-600/90 border-green-200 text-white' : notification.type === 'error' ? 'bg-red-700/90 border-red-300 text-white' : 'bg-stone-900/90 border-stone-600 text-white'}`}>
          <span className="font-black text-lg text-center leading-tight tracking-tight drop-shadow">{notification.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
