
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
    bgmRef.current.volume = 0.25;

    const workSoundUrl = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';
    sfxBuy.current = new Audio(workSoundUrl);
    sfxCook.current = new Audio(workSoundUrl);
    sfxClick.current = new Audio(workSoundUrl);
    
    sfxSuccess.current = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
    sfxSuccess.current.volume = 0.6;
    
    sfxFail.current = new Audio('https://assets.mixkit.co/active_storage/sfx/946/946-preview.mp3');
    sfxFail.current.volume = 0.8;

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
    setTimeout(() => setNotification(null), 2500);
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
      return notify(`${item.name} 采购计划已满!`, 'neutral');
    }

    if (state.money >= item.price) {
      playSfx(sfxBuy.current);
      const deliveryId = Math.random().toString(36).substr(2, 5);
      setState(prev => ({
        ...prev,
        money: prev.money - item.price,
        pendingDeliveries: [...prev.pendingDeliveries, { id: deliveryId, ingredientId: id, timeLeft: item.deliveryTime }]
      }));
      notify(`已下单: ${item.name} 支出 -$${item.price}`, 'neutral');
    } else {
      notify("余额不足以启动采购!", 'error');
    }
  };

  const startCooking = (recipe: Recipe) => {
    const missing = Object.entries(recipe.ingredients)
      .filter(([ingId, count]) => state.inventory[ingId as IngredientId] < (count || 0))
      .map(([ingId]) => ingId as IngredientId);

    if (missing.length > 0) {
      setFlashingIngredients(missing);
      setTimeout(() => setFlashingIngredients([]), 1500);
      return notify("食材短缺!", 'neutral');
    }

    const freeStoveIndex = state.stoves.findIndex(s => !s.isCooking);
    if (freeStoveIndex === -1) return notify("灶台全满!", 'neutral');

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
    notify("烹饪已取消，食材已损耗", 'neutral');
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
              notify(`${INGREDIENTS[d.ingredientId].name} 已送达!`, 'neutral'); 
            } else {
              notify(`${INGREDIENTS[d.ingredientId].name} 仓库溢出!`, 'error');
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
              let msgSuffix = "";
              if (order.type === 'blogger') { popGain = 15; msgSuffix = " (金牌博主推荐!)"; }
              if (order.type === 'happy') { popGain = 10; tip = 20; msgSuffix = " (厚礼小费+$20!)"; }
              newRevenue += recipe.salePrice + tip;
              currentMoney += recipe.salePrice + tip;
              newPopularity = Math.min(100, newPopularity + popGain);
              currentOrders.splice(orderIndex, 1);
              notify(`成功卖出: ${recipe.name}! +$${(recipe.salePrice + tip)}${msgSuffix}`, 'success');
            } else {
              notify(`${recipe.name} 没人下单，可惜了。`, 'neutral');
            }
            return { ...s, isCooking: false, dishId: null, progress: 0 };
          }
          return s;
        });

        const expired = currentOrders.filter(o => o.expiryTime <= 1);
        expired.forEach(o => {
          let popLoss = 5;
          let msg = "订单超时!";
          if (o.type === 'blogger') { popLoss = 30; msg = "博主发了差评视频!"; }
          if (o.type === 'grumpy') { popLoss = 20; msg = "由于等待过久，顾客怒而离席!"; }
          newPopularity = Math.max(0, newPopularity - popLoss);
          notify(`${msg} 人气-${popLoss}`, 'error');
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
    const isPopularityBankrupt = state.gameStatus === 'ended' && state.popularity <= 0;
    const isMoneyBankrupt = state.gameStatus === 'ended' && state.money <= 0;
    const isBankrupt = isPopularityBankrupt || isMoneyBankrupt;

    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-1000 ${isBankrupt ? 'bg-red-950' : 'bg-orange-50'}`}>
        <div className={`max-w-lg w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center border-4 ${isBankrupt ? 'border-red-600' : 'border-orange-200'}`}>
          <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ${isBankrupt ? 'bg-red-100' : 'bg-orange-100'}`}>
            {state.gameStatus === 'idle' ? <Flame className="w-16 h-16 text-orange-600" /> : isBankrupt ? <Skull className="w-16 h-16 text-red-600 animate-pulse" /> : <TrendingUp className="w-16 h-16 text-green-600" />}
          </div>
          <h1 className="text-5xl font-black text-stone-800 mb-6 uppercase tracking-tighter text-balance">Kitchen Master</h1>
          
          {state.gameStatus === 'ended' && (
            <div className="mb-8 p-6 bg-stone-50 rounded-3xl border-2 border-stone-100 shadow-sm">
              {isBankrupt ? (
                <div className="space-y-4">
                   <div className="bg-red-600 text-white py-3 px-4 rounded-2xl font-black text-xl animate-bounce">破产公告</div>
                   <p className="text-red-700 font-bold text-lg leading-relaxed">
                     {isPopularityBankrupt ? "因店铺口碑为零，顾客不再光顾，宣布破产。" : "因店铺资金耗尽，无法支付货款，宣布破产。"}
                   </p>
                </div>
              ) : (
                <>
                  <div className="text-6xl font-black text-orange-600 mb-2">${state.money.toFixed(0)}</div>
                  <div className="text-stone-400 font-bold tracking-widest uppercase text-sm mb-4">最终店铺结算金额</div>
                </>
              )}
              <div className="flex justify-around items-center pt-6 mt-4 border-t border-stone-200/50">
                <div className="flex flex-col items-center">
                  <span className={`text-2xl font-black ${isBankrupt ? 'text-red-600' : 'text-red-500'}`}>{state.popularity}%</span>
                  <span className="text-[10px] uppercase font-bold text-stone-400">品牌口碑</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-green-500">${state.totalRevenue.toFixed(0)}</span>
                  <span className="text-[10px] uppercase font-bold text-stone-400">累计营业额</span>
                </div>
              </div>
            </div>
          )}
          
          <button onClick={startGame} className={`w-full text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-2xl shadow-lg active:translate-y-[10px] active:shadow-none ${isBankrupt ? 'bg-stone-900 hover:bg-black shadow-[0_10px_0_#000]' : 'bg-orange-600 hover:bg-orange-700 shadow-[0_10px_0_#9a3412]'}`}>
            <Play className="w-8 h-8 fill-current" /> {state.gameStatus === 'idle' ? '开启店长生涯' : '重新结算并开始'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-100 flex flex-col font-sans overflow-hidden">
      <style>{`
        @keyframes flash-red {
          0%, 100% { border-color: #ef4444; background-color: #fee2e2; transform: scale(1.02); box-shadow: 0 0 15px rgba(239,68,68,0.5); }
          50% { border-color: #ef4444; background-color: white; transform: scale(1); box-shadow: none; }
        }
        .animate-flash-red { animation: flash-red 0.5s ease-in-out 3; z-index: 10; }
        .supply-row { height: 110px; }
      `}</style>
      
      <header className="bg-white border-b-4 border-stone-200 px-8 py-4 flex items-center justify-between shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 bg-green-50 px-6 py-3 rounded-2xl border-2 border-green-200 shadow-sm">
            <DollarSign className="w-8 h-8 text-green-600" />
            <span className="text-4xl font-black text-green-700 tabular-nums">${state.money.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-3 bg-red-50 px-6 py-3 rounded-2xl border-2 border-red-200 shadow-sm relative overflow-hidden">
             <Heart className={`w-8 h-8 ${state.popularity < 30 ? 'text-red-600 animate-pulse' : 'text-red-500'}`} fill="currentColor" />
             <span className="text-3xl font-black text-red-700">{state.popularity}%</span>
             <div className="absolute bottom-0 left-0 h-1 bg-red-400 transition-all duration-500 shadow-[0_0_8px_red]" style={{ width: `${state.popularity}%` }}></div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => { setIsMuted(!isMuted); playSfx(sfxClick.current); }} className="p-3 rounded-2xl bg-stone-100 hover:bg-stone-200 transition-colors text-stone-600 border-2 border-transparent hover:border-stone-300">
            {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
          </button>
          <div className={`flex items-center gap-4 px-8 py-3 rounded-full border-4 shadow-xl transition-all duration-500 ${state.timeLeft < 30 ? 'bg-red-600 border-white text-white animate-pulse' : 'bg-stone-800 border-stone-700 text-white'}`}>
            <Clock className="w-8 h-8" />
            <span className="text-4xl font-black tabular-nums tracking-tighter">{formatTime(state.timeLeft)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Unified Supply Section: Marketplace & Storage Combined */}
        <section className="col-span-4 bg-white rounded-[2.5rem] shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col">
          <div className="bg-stone-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3"><ShoppingCart className="w-5 h-5 text-blue-400" /><h2 className="text-xs font-black uppercase tracking-widest">进货管理</h2></div>
            <div className="flex items-center gap-3"><Package className="w-5 h-5 text-orange-400" /><h2 className="text-xs font-black uppercase tracking-widest">库存状态 (Max 10)</h2></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-px bg-stone-50/50">
            {(Object.keys(INGREDIENTS) as IngredientId[]).map(id => {
              const ing = INGREDIENTS[id];
              const pendingItems = state.pendingDeliveries.filter(d => d.ingredientId === id);
              const currentTotal = state.inventory[id] + pendingItems.length;
              const isFull = currentTotal >= 10;
              const isLowMoney = state.money < ing.price;

              return (
                <div key={id} className="supply-row flex gap-3 animate-in fade-in slide-in-from-left duration-300">
                  {/* Market Part */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <button 
                      onClick={() => buyIngredient(id)} 
                      disabled={isLowMoney || isFull}
                      className={`relative w-full h-20 group flex items-center justify-between p-3 rounded-2xl border-2 transition-all bg-white shadow-sm ${
                        !isFull && !isLowMoney ? 'border-stone-100 hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30' : 'border-stone-100 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform">{ing.icon}</span>
                      <div className="text-right">
                        <div className={`font-black text-xl ${isLowMoney ? 'text-stone-400' : 'text-blue-600'}`}>${ing.price}</div>
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-tight">{ing.name}</div>
                        {isFull && <div className="text-[8px] font-black text-red-500 uppercase mt-0.5">满库</div>}
                      </div>
                    </button>
                    {/* Delivery Progress Area */}
                    <div className="h-6 flex flex-col justify-center px-1">
                      {pendingItems.length > 0 ? (
                        <div className="space-y-1">
                          {pendingItems.map(d => (
                            <div key={d.id} className="h-1.5 bg-stone-200 rounded-full overflow-hidden relative border border-stone-300/30">
                              <div className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${((ing.deliveryTime - d.timeLeft) / ing.deliveryTime) * 100}%` }} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-1.5 opacity-0" />
                      )}
                    </div>
                  </div>

                  {/* Storage Part - Strictly Aligned */}
                  <div className={`flex-1 p-3 rounded-2xl bg-white border-2 transition-all shadow-sm flex flex-col gap-1 h-20 ${flashingIngredients.includes(id) ? 'animate-flash-red border-red-500' : 'border-stone-200'}`}>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1 shrink-0">
                      <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">{ing.name}</span>
                      <span className={`text-[10px] font-black ${state.inventory[id] >= 10 ? 'text-red-500' : 'text-stone-300'}`}>{state.inventory[id]}/10</span>
                    </div>
                    {/* Fixed 2x5 Grid */}
                    <div className="flex-1 grid grid-cols-5 gap-1.5 p-1 bg-stone-50/50 rounded-lg">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className={`flex items-center justify-center rounded-md border-2 ${i < state.inventory[id] ? 'bg-white border-stone-100 shadow-sm' : 'border-dashed border-stone-100/50'}`}>
                          {i < state.inventory[id] && (
                             <span className="text-xl leading-none drop-shadow-sm animate-in zoom-in duration-300">{ing.icon}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cook & Kitchen Section */}
        <div className="col-span-5 flex flex-col gap-4 overflow-hidden">
          <section className="h-[55%] bg-white rounded-[2.5rem] shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-orange-600 px-5 py-3 flex items-center gap-3 text-white shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
              <h2 className="text-xs font-black uppercase tracking-widest">店长菜单 (点击烹饪)</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto flex-1 bg-orange-50/10">
              {RECIPES.map(recipe => {
                const canCook = Object.entries(recipe.ingredients).every(([ingId, count]) => state.inventory[ingId as IngredientId] >= (count || 0));
                return (
                  <button 
                    key={recipe.id} 
                    onClick={() => startCooking(recipe)} 
                    className={`flex flex-col gap-2 p-4 rounded-3xl border-4 transition-all text-center relative group active:scale-95 border-white shadow-lg bg-white ${canCook ? 'hover:border-orange-400' : 'hover:border-red-300 opacity-80'}`}
                  >
                    <div className="text-5xl group-hover:scale-110 transition-transform mx-auto mb-1 drop-shadow-lg">{recipe.icon}</div>
                    <div className="flex-1">
                      <div className="font-black text-stone-800 text-[11px] uppercase truncate tracking-tight mb-1">{recipe.name}</div>
                      <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                        {Object.entries(recipe.ingredients).map(([id, count]) => (
                          <div key={id} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border ${state.inventory[id as IngredientId] < (count || 0) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-stone-100 border-stone-200/50 text-stone-600'}`}>
                            <span className="text-base leading-none">{INGREDIENTS[id as IngredientId].icon}</span>
                            <span className="text-[10px] font-black">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`mt-auto py-1.5 rounded-xl font-black text-sm ${canCook ? 'bg-green-600 text-white shadow-sm' : 'bg-stone-300 text-stone-500'}`}>${recipe.salePrice}</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="h-[45%] bg-white rounded-[2.5rem] shadow-sm border-2 border-stone-200 p-6 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 mb-4 shrink-0 font-black text-stone-800 uppercase tracking-tighter">
              <Flame className="w-8 h-8 text-orange-600 animate-pulse" /> <h2 className="text-2xl">操作灶台</h2>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6">
              {state.stoves.map(stove => {
                const activeRecipe = RECIPES.find(r => r.id === stove.dishId);
                return (
                  <div key={stove.id} className="relative p-4 rounded-[2.5rem] border-4 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center overflow-hidden group shadow-inner">
                    {stove.isCooking ? (
                      <div className="w-full flex flex-col items-center animate-in zoom-in duration-300 relative">
                        <button onClick={() => cancelCooking(stove.id)} className="absolute -top-3 -left-3 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all z-10 shadow-lg border-2 border-white active:scale-90" title="撤销烹饪"><XCircle className="w-6 h-6" /></button>
                        <div className="text-[80px] leading-none mb-4 relative drop-shadow-2xl">{activeRecipe?.icon}
                          <div className="absolute -top-2 -right-2 bg-orange-600 text-white w-12 h-12 rounded-full border-4 border-white flex items-center justify-center font-black text-xl shadow-xl animate-bounce">{stove.timeRemaining}s</div>
                        </div>
                        <div className="w-full bg-stone-200 h-4 rounded-full overflow-hidden border-2 border-white shadow-inner max-w-[80%]">
                          <div className="bg-gradient-to-r from-orange-400 to-red-600 h-full transition-all duration-1000 ease-linear" style={{ width: `${stove.progress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center opacity-10"><Flame className="w-20 h-20 text-stone-400 mx-auto" /><p className="font-black uppercase mt-2 text-sm tracking-widest">空闲灶台</p></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Orders Section */}
        <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
          <section className="flex-1 bg-white rounded-[2.5rem] shadow-sm border-2 border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-red-500 px-5 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-3"><AlertCircle className="w-6 h-6" /><h2 className="text-lg font-black uppercase tracking-wider">实时订单</h2></div>
              <span className="bg-white text-red-600 text-sm px-3 py-1 rounded-full font-black shadow-inner">{state.activeOrders.length}</span>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-stone-100/30">
              {state.activeOrders.map(order => {
                const recipe = RECIPES.find(r => r.id === order.dishId)!;
                const isCritical = order.expiryTime < 15;
                const progressWidth = (order.expiryTime / order.maxTime) * 100;
                return (
                  <div key={order.id} className={`flex flex-col p-5 rounded-[2.5rem] border-4 transition-all shadow-xl relative bg-white ${isCritical ? 'border-red-500 animate-pulse scale-[0.98]' : 'border-white'}`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-6xl drop-shadow-md shrink-0">{recipe.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-stone-800 text-xl leading-none mb-1 truncate">{recipe.name}</div>
                        <div className="flex items-center justify-between">
                           <div className={`flex items-center gap-1 font-black text-xs uppercase ${isCritical ? 'text-red-600' : 'text-stone-400'}`}><Clock className="w-4 h-4" /> {order.expiryTime}s</div>
                           <div className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${order.type === 'blogger' ? 'bg-purple-100 text-purple-600 border border-purple-200' : order.type === 'grumpy' ? 'bg-red-100 text-red-600 border border-red-200' : order.type === 'happy' ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' : 'bg-stone-100 text-stone-500'}`}>{order.type === 'blogger' ? '博主' : order.type === 'grumpy' ? '挑剔' : order.type === 'happy' ? '豪爽' : '普通'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200/50 shadow-inner">
                      <div className={`h-full transition-all duration-1000 ease-linear ${isCritical ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${progressWidth}%` }} />
                    </div>
                  </div>
                );
              })}
              {state.activeOrders.length === 0 && <div className="text-center py-24 opacity-10 flex flex-col items-center scale-150"><Star className="w-16 h-16 mb-2" /><p className="font-black italic uppercase tracking-widest text-xs">暂无订单</p></div>}
            </div>
          </section>
        </div>
      </main>

      {/* Pop-up Notifications */}
      {notification && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-12 py-10 rounded-[4rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in fade-in duration-300 z-[200] border-8 backdrop-blur-2xl ${notification.type === 'success' ? 'bg-green-600/90 border-green-300 text-white' : notification.type === 'error' ? 'bg-red-700/90 border-red-400 text-white' : 'bg-stone-900/90 border-stone-600 text-white'}`}>
          {notification.type === 'success' ? <Star className="w-24 h-24 animate-spin duration-[3s]" /> : notification.type === 'error' ? <AlertCircle className="w-24 h-24 animate-pulse" /> : <TrendingUp className="w-24 h-24 text-blue-400" />}
          <span className="font-black text-4xl text-center leading-tight tracking-tight drop-shadow-2xl">{notification.msg}</span>
        </div>
      )}
    </div>
  );
};

export default App;
