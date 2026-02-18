
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
    inventory: { tomato: 2, lettuce: 2, onion: 2, meat: 2, bread: 2, cheese: 2, potato: 2 },
    stoves: Array(STOVE_COUNT).fill(null).map((_, i) => ({ id: i, isCooking: false, dishId: null, timeRemaining: 0, progress: 0 })),
    activeOrders: [],
    pendingDeliveries: [],
    totalRevenue: 0,
    popularity: 100,
    timeLeft: GAME_DURATION,
    gameStatus: 'idle',
    isPaused: false
  });
  
  const [showRules, setShowRules] = useState(false);

  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'neutral'} | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [flashingIngredients, setFlashingIngredients] = useState<IngredientId[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // 桌面端动态样式注入 - 处理Tailwind任意值类名和emoji图标
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      const style = document.createElement('style');
      style.id = 'desktop-scale-styles';
      style.textContent = `
        /* 桌面端图标和文字放大 - 针对Tailwind任意值类名和所有emoji图标 */
        @media (min-width: 1024px) {
          /* 食材图标放大 - emoji (2.5倍) */
          .desktop-scale .supply-row button > span:first-child { font-size: 2rem !important; line-height: 1 !important; }
          .desktop-scale .supply-row .text-\\[10px\\] { font-size: 1.25rem !important; }
          .desktop-scale .supply-row .text-\\[7px\\] { font-size: 1rem !important; }
          .desktop-scale .supply-row .text-\\[9px\\] { font-size: 1.125rem !important; }
          /* 确保价格文字不溢出 */
          .desktop-scale .supply-row button { justify-content: space-between !important; }
          .desktop-scale .supply-row button > span:last-child { white-space: nowrap !important; overflow: visible !important; }
          
          /* 菜谱图标放大 - emoji (2.5倍) */
          .desktop-scale .recipe-grid button > div > div:first-child { font-size: 4.5rem !important; line-height: 1 !important; }
          .desktop-scale .recipe-grid .text-\\[10px\\] { font-size: 1.25rem !important; }
          .desktop-scale .recipe-grid .text-\\[8px\\] { font-size: 1rem !important; }
          .desktop-scale .recipe-grid .text-\\[9px\\] { font-size: 1.125rem !important; }
          
          /* 订单图标放大 - emoji (2.5倍) */
          .desktop-scale .col-span-3 .text-2xl { font-size: 3rem !important; line-height: 1 !important; }
          .desktop-scale .col-span-3 .text-\\[9px\\] { font-size: 1.125rem !important; }
          .desktop-scale .col-span-3 .text-\\[7px\\] { font-size: 1rem !important; }
          .desktop-scale .col-span-3 .text-\\[8px\\] { font-size: 1rem !important; }
          
          /* 操作间图标放大 - emoji (2.5倍) */
          .desktop-scale section[class*="h-[25%]"] .text-2xl { font-size: 3rem !important; line-height: 1 !important; }
          .desktop-scale section[class*="h-[25%]"] .text-\\[8px\\] { font-size: 1rem !important; }
          .desktop-scale section[class*="h-[25%]"] .text-\\[7px\\] { font-size: 0.875rem !important; }
          
          /* 所有小尺寸SVG图标统一放大 (2.5倍) */
          .desktop-scale svg.w-2\\.5, .desktop-scale svg.h-2\\.5 { width: 1rem !important; height: 1rem !important; }
          .desktop-scale svg.w-3, .desktop-scale svg.h-3 { width: 1.25rem !important; height: 1.25rem !important; }
          .desktop-scale svg.w-3\\.5, .desktop-scale svg.h-3\\.5 { width: 1.5rem !important; height: 1.5rem !important; }
          .desktop-scale svg.w-4, .desktop-scale svg.h-4 { width: 1.5rem !important; height: 1.5rem !important; }
          
          /* Header区域SVG图标 */
          .desktop-scale header svg.w-4, .desktop-scale header svg.h-4 { width: 1.5rem !important; height: 1.5rem !important; }
          
          /* 进货区域SVG图标 */
          .desktop-scale .supply-row svg.w-3, .desktop-scale .supply-row svg.h-3 { width: 1rem !important; height: 1rem !important; }
          
          /* 菜谱区域SVG图标 */
          .desktop-scale .recipe-grid svg.w-3\\.5, .desktop-scale .recipe-grid svg.h-3\\.5 { width: 1.5rem !important; height: 1.5rem !important; }
          
          /* 操作间SVG图标 */
          .desktop-scale section[class*="h-[25%]"] svg.w-2\\.5, .desktop-scale section[class*="h-[25%]"] svg.h-2\\.5 { width: 1rem !important; height: 1rem !important; }
          .desktop-scale section[class*="h-[25%]"] svg.w-3, .desktop-scale section[class*="h-[25%]"] svg.h-3 { width: 1.25rem !important; height: 1.25rem !important; }
          .desktop-scale section[class*="h-[25%]"] svg.w-3\\.5, .desktop-scale section[class*="h-[25%]"] svg.h-3\\.5 { width: 1.5rem !important; height: 1.5rem !important; }
          
          /* 订单区域SVG图标 */
          .desktop-scale .col-span-3 svg.w-3, .desktop-scale .col-span-3 svg.h-3 { width: 1rem !important; height: 1rem !important; }
          
          /* 通知弹窗放大 */
          .desktop-scale .fixed.px-6 { padding-left: 2rem !important; padding-right: 2rem !important; }
          .desktop-scale .fixed.py-4 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
          .desktop-scale .fixed .text-lg { font-size: 1.5rem !important; }
          .desktop-scale .fixed .gap-2 { gap: 1rem !important; }
          .desktop-scale .fixed .rounded-3xl { border-radius: 2rem !important; }
          .desktop-scale .fixed .border-4 { border-width: 0.5rem !important; }
          
          /* 确保所有边框也按比例放大 */
          .desktop-scale .border { border-width: 0.125rem !important; }
          .desktop-scale .border-2 { border-width: 0.25rem !important; }
        }
      `;
      // 移除旧的样式（如果存在）
      const oldStyle = document.getElementById('desktop-scale-styles');
      if (oldStyle) oldStyle.remove();
      document.head.appendChild(style);
      return () => {
        const styleEl = document.getElementById('desktop-scale-styles');
        if (styleEl) styleEl.remove();
      };
    }
  }, []);
  
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
      inventory: { tomato: 2, lettuce: 2, onion: 2, meat: 2, bread: 2, cheese: 2, potato: 2 },
      stoves: Array(STOVE_COUNT).fill(null).map((_, i) => ({ id: i, isCooking: false, dishId: null, timeRemaining: 0, progress: 0 })),
      activeOrders: [createNewOrder(), createNewOrder(), createNewOrder()], // 初始3个订单（100%人气）
      pendingDeliveries: [],
      totalRevenue: 0,
      popularity: 100,
      timeLeft: GAME_DURATION,
      gameStatus: 'playing',
      isPaused: false
    });
  };

  const buyIngredient = (id: IngredientId) => {
    if (state.isPaused) return;
    
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
    if (state.isPaused) return;
    
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
    if (state.isPaused) return;
    
    playSfx(sfxClick.current);
    const newStoves = state.stoves.map(s => {
      if (s.id === stoveId && s.isCooking) {
        return { ...s, isCooking: false, dishId: null, progress: 0, timeRemaining: 0 };
      }
      return s;
    });
    setState(prev => ({ ...prev, stoves: newStoves }));
  };

  // 根据人气值计算最大订单数
  const getMaxOrders = (popularity: number): number => {
    if (popularity >= 75) return 3;  // 75-100%: 3个订单
    if (popularity >= 50) return 2;   // 50-75%: 2个订单
    return 1;                         // 50%以下: 1个订单
  };

  const togglePause = () => {
    if (state.gameStatus !== 'playing') return;
    playSfx(sfxClick.current);
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  useEffect(() => {
    if (state.gameStatus !== 'playing') return;
    // 如果暂停，清理定时器
    if (state.isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    // 如果未暂停，启动定时器
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

        // 先更新剩余时间，然后过滤掉过期的
        let remainingOrders = currentOrders.map(o => ({ ...o, expiryTime: o.expiryTime - 1 })).filter(o => o.expiryTime > 0);
        
        // 根据更新后的人气值计算最大订单数
        const maxOrders = getMaxOrders(newPopularity);
        
        // 确保订单数量始终保持在最大值（立即补充，不使用随机概率）
        while (remainingOrders.length < maxOrders) {
          remainingOrders.push(createNewOrder());
        }
        // 如果订单数超过最大值，移除多余的订单（从最旧的开始）
        if (remainingOrders.length > maxOrders) {
          remainingOrders.splice(0, remainingOrders.length - maxOrders);
        }

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
  }, [state.gameStatus, state.isPaused]);

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
    <div className={`h-screen bg-stone-100 flex flex-col font-sans overflow-hidden select-none desktop-scale ${state.isPaused ? 'game-paused' : ''}`}>
      <style>{`
        @keyframes flash-red {
          0%, 100% { border-color: #ef4444; background-color: #fee2e2; }
          50% { border-color: #ef4444; background-color: white; }
        }
        .animate-flash-red { animation: flash-red 0.5s ease-in-out 3; z-index: 10; }
        
        /* 基础布局 - 手机横屏优先 */
        .supply-row { height: 36px; }
        .recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
        
        /* 确保进货按钮和仓库容器高度一致 */
        .supply-row button { min-width: fit-content; }
        .supply-row .flex-1 { min-height: 100%; }
        
        /* 暂停时按钮变灰 - 但不包括控制按钮（规则、静音、暂停） */
        .game-paused header button,
        .game-paused button[title="游戏规则"],
        .game-paused button:has(svg[class*="Volume"]) {
          opacity: 1 !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .game-paused button:not(header button):not([title="游戏规则"]):not(:has(svg[class*="Volume"])):not(:disabled) {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
        }

        /* ===== 手机横屏适配 (320px - 640px) ===== */
        @media (max-width: 640px) {
          /* Header - 紧凑布局 */
          header { padding: 4px 8px !important; }
          header .gap-4 { gap: 6px !important; }
          header .gap-2 { gap: 4px !important; }
          header .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
          header .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          header .px-4 { padding-left: 8px !important; padding-right: 8px !important; }
          header .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          header .p-1\\.5 { padding: 4px !important; }
          header svg.w-4, header svg.h-4 { width: 14px !important; height: 14px !important; }
          header .rounded-lg { border-radius: 6px !important; }
          header .rounded-full { border-radius: 9999px !important; }
          header .text-xl { font-size: 14px !important; }
          header .text-lg { font-size: 12px !important; }
          
          /* 进货区域 - 紧凑 */
          .supply-row { height: 32px !important; }
          .supply-row .w-16 { width: 52px !important; }
          .supply-row button { height: 24px !important; padding: 2px 4px !important; }
          .supply-row button > span:first-child { font-size: 14px !important; }
          .supply-row .text-\\[7px\\] { font-size: 9px !important; }
          .supply-row h2 { font-size: 8px !important; }
          .supply-row svg.w-3, .supply-row svg.h-3 { width: 10px !important; height: 10px !important; }
          .supply-row .h-\\[29px\\] { height: 24px !important; min-height: 24px !important; }
          .supply-row .min-h-\\[29px\\] { min-height: 24px !important; }
          .supply-row .grid-cols-10 { min-height: 22px !important; height: 22px !important; }
          .supply-row .grid .text-\\[10px\\] { font-size: 8px !important; }
          .supply-row .p-0\\.5 { padding: 2px !important; }
          .supply-row .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
          .supply-row .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .supply-row .gap-1 { gap: 2px !important; }
          .supply-row .gap-0\\.5 { gap: 1px !important; }
          
          /* 菜谱区域 - 紧凑 */
          .recipe-grid { gap: 2px !important; padding: 4px !important; }
          .recipe-grid button { padding: 4px !important; border-radius: 8px !important; }
          .recipe-grid button > div > div:first-child { font-size: 20px !important; }
          .recipe-grid .text-\\[10px\\] { font-size: 8px !important; }
          .recipe-grid .text-\\[8px\\] { font-size: 7px !important; }
          .recipe-grid .text-\\[9px\\] { font-size: 8px !important; }
          .recipe-grid svg { width: 12px !important; height: 12px !important; }
          .recipe-grid .mb-1 { margin-bottom: 2px !important; }
          .recipe-grid .gap-1 { gap: 2px !important; }
          .recipe-grid .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .recipe-grid h2 { font-size: 8px !important; }
          
          /* 操作间 - 紧凑 */
          section[class*="h-\\[25%\\]"] { padding: 4px 8px !important; }
          section[class*="h-\\[25%\\]"] svg { width: 12px !important; height: 12px !important; }
          section[class*="h-\\[25%\\]"] .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
          section[class*="h-\\[25%\\]"] .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          section[class*="h-\\[25%\\]"] .gap-1\\.5 { gap: 4px !important; }
          section[class*="h-\\[25%\\]"] .mb-1 { margin-bottom: 4px !important; }
          section[class*="h-\\[25%\\]"] .gap-2 { gap: 6px !important; }
          section[class*="h-\\[25%\\]"] .text-2xl { font-size: 20px !important; }
          section[class*="h-\\[25%\\]"] .text-\\[8px\\] { font-size: 7px !important; }
          section[class*="h-\\[25%\\]"] .text-\\[7px\\] { font-size: 6px !important; }
          section[class*="h-\\[25%\\]"] .rounded-sm { border-radius: 4px !important; }
          section[class*="h-\\[25%\\]"] .rounded-lg { border-radius: 6px !important; }
          section[class*="h-\\[25%\\]"] .h-1\\.5 { height: 4px !important; }
          
          /* 订单区域 - 紧凑 */
          .col-span-3:last-child section { padding: 4px !important; }
          .col-span-3 svg { width: 12px !important; height: 12px !important; }
          .col-span-3 .space-y-1 > div { padding: 6px !important; margin-bottom: 4px !important; }
          .col-span-3 .px-2 { padding-left: 4px !important; padding-right: 4px !important; }
          .col-span-3 .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .col-span-3 .text-2xl { font-size: 20px !important; }
          .col-span-3 .text-\\[9px\\] { font-size: 8px !important; }
          .col-span-3 .text-\\[7px\\] { font-size: 6px !important; }
          .col-span-3 .text-\\[8px\\] { font-size: 7px !important; }
          .col-span-3 .gap-1\\.5 { gap: 4px !important; }
          .col-span-3 .gap-1 { gap: 2px !important; }
          .col-span-3 .mb-1 { margin-bottom: 4px !important; }
          .col-span-3 .rounded-lg { border-radius: 6px !important; }
          .col-span-3 .rounded-xl { border-radius: 8px !important; }
          .col-span-3 .px-1\\.5 { padding-left: 4px !important; padding-right: 4px !important; }
          .col-span-3 .p-1 { padding: 4px !important; }
          .col-span-3 .h-1 { height: 3px !important; }
          
          /* 全局 */
          main { padding: 4px !important; gap: 4px !important; }
          .text-xl { font-size: 14px !important; }
          .text-lg { font-size: 12px !important; }
          .text-2xl { font-size: 20px !important; }
          .text-3xl { font-size: 28px !important; }
        }

        /* ===== 中等屏幕适配 (640px - 1024px) ===== */
        @media (min-width: 641px) and (max-width: 1023px) {
          /* 进货区域 */
          .supply-row { height: 38px !important; }
          .supply-row .w-16 { width: 56px !important; }
          .supply-row button { height: 26px !important; padding: 3px 6px !important; }
          .supply-row button > span:first-child { font-size: 16px !important; }
          .supply-row .h-\\[29px\\] { height: 26px !important; min-height: 26px !important; }
          .supply-row .min-h-\\[29px\\] { min-height: 26px !important; }
          .supply-row .grid-cols-10 { min-height: 24px !important; height: 24px !important; }
          
          /* 菜谱区域 */
          .recipe-grid button > div > div:first-child { font-size: 28px !important; }
          
          /* 操作间 */
          section[class*="h-\\[25%\\]"] .text-2xl { font-size: 24px !important; }
          
          /* 订单区域 */
          .col-span-3 .text-2xl { font-size: 24px !important; }
        }

        /* ===== 桌面端适配 (1024px以上) ===== */
        @media (min-width: 1024px) {
          /* 全局间距和内边距放大 */
          .desktop-scale .p-1 { padding: 8px !important; }
          .desktop-scale .gap-1 { gap: 8px !important; }
          .desktop-scale main { padding: 8px !important; }
          .desktop-scale main .gap-1 { gap: 8px !important; }
          
          /* Header 区域 */
          .desktop-scale header { padding: 12px 24px !important; }
          .desktop-scale header svg { width: 24px !important; height: 24px !important; }
          .desktop-scale header .gap-4 { gap: 16px !important; }
          .desktop-scale header .gap-2 { gap: 12px !important; }
          .desktop-scale header .rounded-lg { border-radius: 12px !important; }
          .desktop-scale header .rounded-full { border-radius: 9999px !important; }
          
          /* 进货区域 */
          .desktop-scale .col-span-3 { padding: 0 !important; }
          .desktop-scale .supply-row { height: 60px !important; }
          .desktop-scale .supply-row button { height: 48px !important; padding: 8px 12px !important; }
          .desktop-scale .supply-row .w-16 { width: 72px !important; }
          .desktop-scale .supply-row button > span:first-child { font-size: 28px !important; line-height: 1 !important; }
          .desktop-scale .supply-row .text-\\[10px\\] { font-size: 16px !important; }
          .desktop-scale .supply-row .text-\\[7px\\] { font-size: 12px !important; }
          .desktop-scale .supply-row .text-\\[9px\\] { font-size: 14px !important; }
          .desktop-scale .supply-row h2 { font-size: 12px !important; }
          .desktop-scale .supply-row svg { width: 16px !important; height: 16px !important; }
          .desktop-scale .supply-row .h-\\[29px\\] { height: 48px !important; min-height: 48px !important; }
          .desktop-scale .supply-row .min-h-\\[29px\\] { min-height: 48px !important; }
          .desktop-scale .supply-row .grid-cols-10 { min-height: 44px !important; height: 44px !important; }
          .desktop-scale .supply-row .grid .text-\\[10px\\] { font-size: 14px !important; }
          
          /* 菜谱区域 */
          .desktop-scale .recipe-grid { gap: 8px !important; padding: 12px !important; }
          .desktop-scale .recipe-grid button { padding: 12px !important; border-radius: 16px !important; }
          .desktop-scale .recipe-grid button > div > div:first-child { font-size: 48px !important; line-height: 1 !important; }
          .desktop-scale .recipe-grid .text-\\[10px\\] { font-size: 16px !important; }
          .desktop-scale .recipe-grid .text-\\[8px\\] { font-size: 12px !important; }
          .desktop-scale .recipe-grid .text-\\[9px\\] { font-size: 14px !important; }
          .desktop-scale .recipe-grid svg { width: 20px !important; height: 20px !important; }
          .desktop-scale .recipe-grid h2 { font-size: 14px !important; }
          
          /* 操作间 */
          .desktop-scale section[class*="h-\\[25%\\]"] { padding: 16px 24px !important; }
          .desktop-scale section[class*="h-\\[25%\\]"] svg { width: 16px !important; height: 16px !important; }
          .desktop-scale section[class*="h-\\[25%\\]"] .text-2xl { font-size: 36px !important; }
          .desktop-scale section[class*="h-\\[25%\\]"] .text-\\[8px\\] { font-size: 12px !important; }
          .desktop-scale section[class*="h-\\[25%\\]"] .text-\\[7px\\] { font-size: 10px !important; }
          
          /* 订单区域 */
          .desktop-scale .col-span-3:last-child section { padding: 12px !important; }
          .desktop-scale .col-span-3 svg { width: 16px !important; height: 16px !important; }
          .desktop-scale .col-span-3 .text-2xl { font-size: 36px !important; }
          .desktop-scale .col-span-3 .text-\\[9px\\] { font-size: 14px !important; }
          .desktop-scale .col-span-3 .text-\\[7px\\] { font-size: 12px !important; }
          .desktop-scale .col-span-3 .text-\\[8px\\] { font-size: 12px !important; }
          
          /* 文字和图标尺寸放大 */
          .desktop-scale .text-xl { font-size: 28px !important; }
          .desktop-scale .text-lg { font-size: 24px !important; }
          .desktop-scale .text-2xl { font-size: 36px !important; }
          .desktop-scale .text-3xl { font-size: 56px !important; }
          
          /* 圆角放大 */
          .desktop-scale .rounded-xl { border-radius: 20px !important; }
          .desktop-scale .rounded-lg { border-radius: 12px !important; }
          .desktop-scale .rounded-md { border-radius: 8px !important; }
        }
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
          <button onClick={() => { setShowRules(true); if (state.gameStatus === 'playing') setState(prev => ({ ...prev, isPaused: true })); }} className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 z-[400] relative" title="游戏规则" style={{ pointerEvents: 'auto' }}>
            <AlertCircle className="w-4 h-4" />
          </button>
          <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-200 z-[400] relative" style={{ pointerEvents: 'auto' }}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={togglePause} disabled={state.gameStatus !== 'playing'} className={`flex items-center gap-1.5 px-4 py-1 rounded-full border transition-all ${state.timeLeft < 30 ? 'bg-red-600 text-white animate-pulse border-white' : 'bg-stone-800 text-white border-stone-700'} ${state.gameStatus !== 'playing' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'} z-[400] relative`} style={{ pointerEvents: 'auto' }}>
            <Clock className="w-4 h-4" />
            <span className="text-xl font-black tabular-nums">{formatTime(state.timeLeft)}</span>
            {state.isPaused && <span className="text-xs ml-1">(暂停)</span>}
          </button>
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
            {(Object.keys(INGREDIENTS) as IngredientId[]).sort((a, b) => INGREDIENTS[a].price - INGREDIENTS[b].price).map(id => {
              const ing = INGREDIENTS[id];
              const pendingItems = state.pendingDeliveries.filter(d => d.ingredientId === id);
              const currentTotal = state.inventory[id] + pendingItems.length;
              const isFull = currentTotal >= 10;
              const isLowMoney = state.money < ing.price;
              return (
                <div key={id} className="supply-row flex gap-1">
                  <div className="w-16 flex flex-col gap-0.5">
                    <button onClick={() => buyIngredient(id)} disabled={isLowMoney || isFull || state.isPaused} className={`relative w-full h-[29px] flex items-center justify-between px-1.5 rounded-md border transition-all bg-white shadow-sm ${!isFull && !isLowMoney && !state.isPaused ? 'border-stone-100 hover:border-blue-400' : 'border-stone-100 opacity-60 cursor-not-allowed'}`}>
                      <span className="text-lg leading-none shrink-0">{ing.icon}</span>
                      <span className={`font-black text-[7px] shrink-0 ${isLowMoney ? 'text-stone-300' : 'text-blue-600'}`}>${ing.price}</span>
                    </button>
                    <div className="h-0.5 flex gap-0.5 px-0.5">{pendingItems.map(d => (<div key={d.id} className="flex-1 h-full bg-stone-200 rounded-full overflow-hidden relative"><div className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${((ing.deliveryTime - d.timeLeft) / ing.deliveryTime) * 100}%` }} /></div>))}</div>
                  </div>
                  <div className={`flex-1 p-0.5 rounded-lg bg-white border transition-all shadow-sm flex items-center h-[29px] min-h-[29px] mt-0 ${flashingIngredients.includes(id) ? 'animate-flash-red border-red-500' : 'border-stone-100'}`}>
                    <div className="flex-1 grid grid-cols-10 gap-0.5 p-0.5 bg-stone-50/50 rounded-md h-full min-h-full">
                      {Array.from({ length: 10 }).map((_, i) => (<div key={i} className={`flex items-center justify-center rounded-sm border aspect-square ${i < state.inventory[id] ? 'bg-white border-stone-50' : 'border-dashed border-stone-100/10'}`}>{i < state.inventory[id] && <span className="text-[10px] leading-none">{ing.icon}</span>}</div>))}
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
            <div className="bg-stone-700 px-2 py-1 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-orange-300" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">菜谱</h2></div>
              <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-orange-300" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">选择</h2></div>
            </div>
            <div className="p-1 recipe-grid overflow-y-auto flex-1 bg-stone-100/10">
              {[...RECIPES].sort((a, b) => a.salePrice - b.salePrice).map(recipe => {
                const canCook = Object.entries(recipe.ingredients).every(([ingId, count]) => state.inventory[ingId as IngredientId] >= (count || 0));
                return (
                  <button 
                    key={recipe.id} 
                    onClick={() => startCooking(recipe)} 
                    disabled={state.isPaused}
                    className={`flex flex-col p-1.5 rounded-xl border-2 transition-all relative active:scale-95 bg-white shadow-sm overflow-hidden group ${canCook && !state.isPaused ? 'border-orange-50 hover:border-orange-400' : 'border-transparent opacity-60 grayscale-[40%]'} ${state.isPaused ? 'cursor-not-allowed' : ''}`}
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
            <div className="flex items-center gap-1 shrink-0 font-black text-stone-400 uppercase tracking-wider text-[9px]">
              <Flame className="w-3 h-3 text-orange-500" /> 灶台
            </div>
            <div className="flex-1 flex gap-2">
              {state.stoves.map(stove => {
                const activeRecipe = RECIPES.find(r => r.id === stove.dishId);
                return (
                  <div key={stove.id} className="flex-1 relative px-2 py-1 rounded-lg border border-stone-100 bg-stone-50/50 flex items-center shadow-inner group overflow-hidden">
                    {stove.isCooking ? (
                      <div className="w-full flex items-center gap-2 animate-in slide-in-from-bottom-1 duration-200">
                        <button onClick={() => cancelCooking(stove.id)} disabled={state.isPaused} className={`p-0.5 text-red-400 rounded-full transition-colors ${state.isPaused ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-50'}`}><XCircle className="w-3.5 h-3.5" /></button>
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
        <section className="col-span-3 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="bg-stone-700 px-2 py-1 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-300" /><h2 className="text-[9px] font-black uppercase tracking-wider truncate">订单</h2></div>
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
      </main>

      {/* Center Popup Notifications */}
      {notification && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-3xl shadow-xl flex flex-col items-center gap-2 animate-in zoom-in fade-in duration-300 z-[200] border-4 backdrop-blur-md ${notification.type === 'success' ? 'bg-green-600/90 border-green-200 text-white' : notification.type === 'error' ? 'bg-red-700/90 border-red-300 text-white' : 'bg-stone-900/90 border-stone-600 text-white'}`}>
          <span className="font-black text-lg text-center leading-tight tracking-tight drop-shadow">{notification.msg}</span>
        </div>
      )}

      {/* Game Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) { setShowRules(false); if (state.gameStatus === 'playing') setState(prev => ({ ...prev, isPaused: false })); } }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-orange-200 animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-orange-600 text-white px-6 py-4 flex items-center justify-between border-b-4 border-orange-700 z-10">
              <h2 className="text-2xl font-black uppercase tracking-wider">游戏规则</h2>
              <button 
                onClick={() => { 
                  setShowRules(false); 
                  if (state.gameStatus === 'playing') {
                    setState(prev => ({ ...prev, isPaused: false })); 
                  }
                }} 
                className="p-2 hover:bg-orange-700 rounded-lg transition-colors z-50 relative"
                style={{ pointerEvents: 'auto', zIndex: 999 }}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 text-stone-800">
              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">游戏目标</h3>
                <p className="text-base leading-relaxed">在规定的4分钟内，让店铺赚取最多的钱。但要注意：<strong className="text-red-600">人气值不能降到0%</strong>，否则游戏失败！</p>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">人气值系统</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>初始值：</strong>100%</li>
                  <li>• <strong>成功完成订单：</strong>+1% 人气值</li>
                  <li>• <strong>订单过期：</strong>-5% 人气值</li>
                  <li>• <strong>特殊顾客：</strong>
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>- 博主：完成订单 +15% 人气，过期 -30% 人气</li>
                      <li>- 挑剔顾客：过期 -20% 人气</li>
                      <li>- 豪爽顾客：完成订单 +10% 人气，额外 +$20 小费</li>
                    </ul>
                  </li>
                  <li>• <strong>订单数量：</strong>根据人气值动态调整
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>- 100% 人气：同时最多3个订单</li>
                      <li>- 75% 人气：同时最多2个订单</li>
                      <li>- 50% 以下：同时最多1个订单</li>
                    </ul>
                  </li>
                  <li>• <strong>失败条件：</strong>人气值降到0%或余额降到$0</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">店铺余额</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>初始资金：</strong>$100</li>
                  <li>• <strong>收入来源：</strong>完成订单获得菜品售价</li>
                  <li>• <strong>支出：</strong>购买食材</li>
                  <li>• <strong>特殊收入：</strong>豪爽顾客会额外给小费 +$20</li>
                  <li>• <strong>最终结算：</strong>游戏结束时显示最终余额和累计营业额</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">进货规则</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>点击食材按钮：</strong>花费对应价格购买食材</li>
                  <li>• <strong>配送时间：</strong>购买后需要等待配送时间（秒）才能到货</li>
                  <li>• <strong>库存上限：</strong>每种食材最多存储10个（包括配送中的）</li>
                  <li>• <strong>价格排序：</strong>食材按价格从低到高排列</li>
                  <li>• <strong>配送进度：</strong>蓝色进度条显示配送进度</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">做菜规则</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>点击菜谱卡片：</strong>开始烹饪对应菜品</li>
                  <li>• <strong>食材需求：</strong>必须拥有足够的食材才能开始烹饪</li>
                  <li>• <strong>烹饪时间：</strong>不同菜品需要不同的烹饪时间（秒）</li>
                  <li>• <strong>灶台数量：</strong>同时最多在2个灶台上烹饪</li>
                  <li>• <strong>取消烹饪：</strong>可以点击X按钮取消，但食材会损耗</li>
                  <li>• <strong>完成烹饪：</strong>如果有对应订单，自动完成并获得收入</li>
                  <li>• <strong>无订单：</strong>如果完成时没有对应订单，菜品浪费</li>
                  <li>• <strong>价格排序：</strong>菜谱按售价从低到高排列</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">订单规则</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>订单生成：</strong>随机生成，有时间限制（45-70秒）</li>
                  <li>• <strong>订单类型：</strong>普通、博主、挑剔、豪爽四种顾客类型</li>
                  <li>• <strong>完成方式：</strong>烹饪对应菜品后自动完成</li>
                  <li>• <strong>过期惩罚：</strong>订单过期会扣除人气值</li>
                  <li>• <strong>紧急提示：</strong>剩余时间少于15秒时，订单会闪烁红色</li>
                  <li>• <strong>订单数量：</strong>根据当前人气值动态调整（见人气值系统）</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">操作提示</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>暂停游戏：</strong>点击倒计时可以暂停/继续游戏</li>
                  <li>• <strong>暂停状态：</strong>暂停时所有按钮变灰，无法操作</li>
                  <li>• <strong>查看规则：</strong>点击规则按钮可以随时查看游戏规则</li>
                  <li>• <strong>静音：</strong>点击音量按钮可以开关音效</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
