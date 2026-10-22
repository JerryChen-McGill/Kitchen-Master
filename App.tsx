
import React, { useState, useEffect, useRef } from 'react';
import { CookButton, DeliveryClock, DishArtwork, RecipeCard, StockShelf } from './KitchenUI';
import './kitchen.css';
import { 
  ShoppingCart, Flame, Clock, DollarSign, Package, Play, 
  RotateCcw, AlertCircle, Heart, TrendingUp, TrendingDown, 
  Truck, Star, Volume2, VolumeX, XCircle, Trash2, Skull, Trophy, User
} from 'lucide-react';
import { INGREDIENTS, RECIPES, INITIAL_MONEY, GAME_DURATION, STOVE_COUNT, INITIAL_STOVES, STOVE_INSTALL_COST, STOVE_INSTALL_TIME } from './constants';
import { IngredientId, GameState, Recipe, Order, Stove, PendingDelivery, CustomerType } from './types';

// 排行榜相关函数
interface LeaderboardEntry {
  name: string;
  score: number;
  popularity: number;
  date: string;
}

const getLeaderboard = (): LeaderboardEntry[] => {
  const data = localStorage.getItem('kitchenMaster_leaderboard');
  return data ? JSON.parse(data) : [];
};

const saveToLeaderboard = (name: string, score: number, popularity: number) => {
  const leaderboard = getLeaderboard();
  leaderboard.push({ name, score, popularity, date: new Date().toLocaleDateString() });
  leaderboard.sort((a, b) => b.score - a.score);
  const top6 = leaderboard.slice(0, 6);
  localStorage.setItem('kitchenMaster_leaderboard', JSON.stringify(top6));
};

const isLeaderboardQualified = (score: number): boolean => {
  const leaderboard = getLeaderboard();
  if (leaderboard.length < 6) return true;
  return score > leaderboard[leaderboard.length - 1].score;
};

// 最高分相关函数
const getHighScore = (): number => {
  const data = localStorage.getItem('kitchenMaster_highscore');
  return data ? parseInt(data, 10) : 0;
};

const saveHighScore = (score: number) => {
  const currentHigh = getHighScore();
  if (score > currentHigh) {
    localStorage.setItem('kitchenMaster_highscore', score.toString());
    return true;
  }
  return false;
};

// 创建灶台数组 - 初始只有前INITIAL_STOVES个灶台已安装
const createStoves = (): Stove[] => {
  return Array(STOVE_COUNT).fill(null).map((_, i) => ({
    id: i,
    isInstalled: i < INITIAL_STOVES, // 前2个灶台默认已安装
    installTimeLeft: 0,
    isCooking: false,
    isDone: false,
    dishId: null,
    orderId: null,
    timeRemaining: 0,
    progress: 0
  }));
};

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    money: INITIAL_MONEY,
    inventory: { tomato: 2, lettuce: 2, onion: 2, meat: 2, bread: 2, cheese: 2, potato: 2 },
    stoves: createStoves(),
    activeOrders: [],
    pendingDeliveries: [],
    totalRevenue: 0,
    popularity: 100,
    timeLeft: GAME_DURATION,
    gameStatus: 'idle',
    isPaused: false
  });
  
  const [showRules, setShowRules] = useState(false);
  const [showHomepage, setShowHomepage] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHighScore, setShowHighScore] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [pendingScore, setPendingScore] = useState(0);
  const [pendingPopularity, setPendingPopularity] = useState(0);

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

  // 游戏结束后检查排行榜和最高分
  useEffect(() => {
    if (state.gameStatus === 'ended' && state.money > 0) {
      // 保存最高分
      saveHighScore(state.money);
      
      // 检查是否进入排行榜
      if (isLeaderboardQualified(state.money)) {
        setPendingScore(state.money);
        setPendingPopularity(state.popularity);
        setShowNameEntry(true);
      } else {
        // 不进入排行榜则返回首页
        setShowHomepage(true);
      }
    }
  }, [state.gameStatus]);

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
    
    const expiry = 40 + Math.floor(Math.random() * 40); // 40-80秒
    return {
      id: Math.random().toString(36).substr(2, 9),
      dishId: randomRecipe.id,
      expiryTime: expiry,
      maxTime: 80, // 统一80秒
      type,
      isUrgent: false,
      urgentTimeLeft: 0,
      isCooking: false
    };
  };

  const startGame = () => {
    playSfx(sfxClick.current);
    bgmRef.current?.play().catch(() => {});
    setState({
      money: INITIAL_MONEY,
      inventory: { tomato: 2, lettuce: 2, onion: 2, meat: 2, bread: 2, cheese: 2, potato: 2 },
      stoves: createStoves(),
      activeOrders: [createNewOrder(), createNewOrder(), createNewOrder(), createNewOrder()], // 初始4个订单（100%人气）
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
    if (state.money <= 0) return notify("资金不足，无法购买原材料!", 'error');
    
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

  const sellIngredient = (id: IngredientId) => {
    if (state.isPaused) return;
    if (state.inventory[id] <= 0) return notify("仓库中没有该食材!", 'error');
    
    const item = INGREDIENTS[id];
    const sellPrice = Math.floor(item.price / 2); // 半价卖出
    
    playSfx(sfxSuccess.current);
    setState(prev => ({
      ...prev,
      money: prev.money + sellPrice,
      inventory: { ...prev.inventory, [id]: prev.inventory[id] - 1 }
    }));
    notify(`卖出 ${item.name} +$${sellPrice}`, 'success');
  };

  const startCooking = (recipe: Recipe, orderId: string | null = null) => {
    if (state.isPaused) return;
    
    const missing = Object.entries(recipe.ingredients)
      .filter(([ingId, count]) => state.inventory[ingId as IngredientId] < (count || 0))
      .map(([ingId]) => ingId as IngredientId);

    if (missing.length > 0) {
      setFlashingIngredients(missing);
      setTimeout(() => setFlashingIngredients([]), 1500);
      return;
    }

    const freeStoveIndex = state.stoves.findIndex(s => s.isInstalled && !s.isCooking && !s.isDone);
    if (freeStoveIndex === -1) return notify("没有可用的灶台!", 'error');

    playSfx(sfxCook.current);
    const newInventory = { ...state.inventory };
    Object.entries(recipe.ingredients).forEach(([ingId, count]) => { newInventory[ingId as IngredientId] -= (count || 0); });
    const newStoves = [...state.stoves];
    newStoves[freeStoveIndex] = { ...newStoves[freeStoveIndex], isCooking: true, dishId: recipe.id, orderId, timeRemaining: recipe.cookingTime, progress: 0 };
    setState(prev => ({ ...prev, inventory: newInventory, stoves: newStoves }));
  };

  // 接受订单并开始烹饪
  const acceptOrder = (order: Order) => {
    if (state.isPaused) return;
    
    const recipe = RECIPES.find(r => r.id === order.dishId);
    if (!recipe) return;

    // 先标记订单为制作中
    setState(prev => ({
      ...prev,
      activeOrders: prev.activeOrders.map(o => 
        o.id === order.id ? { ...o, isCooking: true } : o
      )
    }));

    // 然后开始烹饪，传递订单ID
    setTimeout(() => {
      startCooking(recipe, order.id);
    }, 0);
  };

  const cancelCooking = (stoveId: number) => {
    if (state.isPaused) return;
    
    playSfx(sfxClick.current);
    const newStoves = state.stoves.map(s => {
      if (s.id === stoveId && s.isCooking) {
        return { ...s, isCooking: false, dishId: null, orderId: null, progress: 0, timeRemaining: 0 };
      }
      return s;
    });
    setState(prev => ({ ...prev, stoves: newStoves }));
  };

  // 丢弃已做好的菜品
  const discardDish = (stoveId: number) => {
    if (state.isPaused) return;
    
    playSfx(sfxClick.current);
    const newStoves = state.stoves.map(s => {
      if (s.id === stoveId && s.isDone) {
        return { ...s, isDone: false, dishId: null, orderId: null, progress: 0 };
      }
      return s;
    });
    setState(prev => ({ ...prev, stoves: newStoves }));
    notify("菜品已丢弃", 'neutral');
  };

  // 上菜 - 用灶台上的菜品完成订单
  const serveDish = (orderId: string) => {
    if (state.isPaused) return;
    
    const order = state.activeOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const recipe = RECIPES.find(r => r.id === order.dishId);
    if (!recipe) return;
    
    // 查找灶台上是否有对应的已做好的菜品
    const stoveIndex = state.stoves.findIndex(s => s.isDone && s.dishId === order.dishId);
    if (stoveIndex === -1) {
      notify("灶台上没有对应的菜品!", 'error');
      return;
    }
    
    // 清除灶台上的菜品
    const newStoves = state.stoves.map((s, i) => {
      if (i === stoveIndex) {
        return { ...s, isDone: false, dishId: null, orderId: null, progress: 0 };
      }
      return s;
    });
    
    // 计算收益
    let popGain = 1;
    let tip = 0;
    if (order.type === 'blogger') { popGain = 15; }
    if (order.type === 'happy') { popGain = 10; tip = 20; }
    
    // 移除订单
    const newOrders = state.activeOrders.filter(o => o.id !== orderId);
    
    playSfx(sfxSuccess.current);
    setState(prev => ({
      ...prev,
      stoves: newStoves,
      activeOrders: newOrders,
      money: prev.money + recipe.salePrice + tip,
      totalRevenue: prev.totalRevenue + recipe.salePrice + tip,
      popularity: Math.min(100, prev.popularity + popGain)
    }));
    notify(`上菜: ${recipe.name}! +$${recipe.salePrice + tip}`, 'success');
  };

  // 安装新灶台
  const installStove = (stoveId: number) => {
    if (state.isPaused) return;
    
    const stove = state.stoves[stoveId];
    if (stove.isInstalled || stove.installTimeLeft > 0) return; // 灶台已安装或正在安装
    if (state.money < STOVE_INSTALL_COST) return notify("资金不足，无法安装新灶台!", 'error');
    
    playSfx(sfxBuy.current);
    setState(prev => ({
      ...prev,
      money: prev.money - STOVE_INSTALL_COST,
      stoves: prev.stoves.map(s => {
        if (s.id === stoveId) {
          return { ...s, installTimeLeft: STOVE_INSTALL_TIME };
        }
        return s;
      })
    }));
    notify(`开始安装新灶台...`, 'neutral');
  };

  // 根据人气值计算最大订单数
  const getMaxOrders = (popularity: number): number => {
    if (popularity >= 80) return 4;  // 80-100%: 4个订单
    if (popularity >= 60) return 3;  // 60-80%: 3个订单
    if (popularity >= 40) return 2; // 40-60%: 2个订单
    return 1;                        // 40%以下: 1个订单
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
        if (prev.timeLeft <= 0 || prev.popularity <= 0) { 
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
          // 处理灶台安装倒计时
          if (s.installTimeLeft > 0) {
            const newInstallTime = s.installTimeLeft - 1;
            if (newInstallTime === 0) {
              // 安装完成
              return { ...s, isInstalled: true, installTimeLeft: 0 };
            }
            return { ...s, installTimeLeft: newInstallTime };
          }
          // 处理烹饪倒计时
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
            
            // 如果有关联的订单ID，尝试自动完成订单
            if (s.orderId) {
              const orderIndex = currentOrders.findIndex(o => o.id === s.orderId);
              if (orderIndex !== -1) {
                // 订单还存在，自动完成
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
                return { ...s, isCooking: false, dishId: null, orderId: null, progress: 0 };
              }
              // 订单已过期，灶台上的菜保留，需要手动上菜
            }
            
            // 从菜单直接点击制作的菜，或者关联的订单已过期，保留在灶台
            return { ...s, isCooking: false, isDone: true, progress: 100 };
          }
          return s;
        });

        // 检查订单是否到期
        const expired = currentOrders.filter(o => o.expiryTime <= 1);
        expired.forEach(o => {
          // 订单彻底过期，扣除人气值
          let popLoss = 5;
          if (o.type === 'blogger') { popLoss = 30; }
          if (o.type === 'grumpy') { popLoss = 20; }
          newPopularity = Math.max(0, newPopularity - popLoss);
          notify("订单过期!", "error");
        });

        // 更新所有订单的倒计时
        currentOrders = currentOrders.map(o => {
          return { ...o, expiryTime: o.expiryTime - 1 };
        });

        // 过滤掉已过期的订单（expiryTime <= 0）
        let remainingOrders = currentOrders.filter(o => o.expiryTime > 0);
        
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

  // 主页UI
  if (showHomepage) {
    const highScore = getHighScore();
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-100 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo区域 */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Flame className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-orange-600 uppercase tracking-wider">Kitchen Master</h1>
            <p className="text-stone-500 font-bold mt-2">汉堡店经营模拟游戏</p>
          </div>

          {/* 按钮区域 */}
          <div className="space-y-4">
            <button 
              onClick={() => { setShowHomepage(false); startGame(); }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl text-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" /> 开始经营
            </button>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowHomepage(false); setShowLeaderboard(true); }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-black py-3 rounded-xl text-lg shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Trophy className="w-5 h-5" /> 排行榜
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 排行榜UI
  if (showLeaderboard) {
    const leaderboard = getLeaderboard();
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <h2 className="text-2xl font-black text-stone-800">排行榜</h2>
            </div>
            <button onClick={() => { setShowLeaderboard(false); setShowHomepage(true); }} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200">
              <XCircle className="w-6 h-6 text-stone-500" />
            </button>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 text-yellow-200 mx-auto mb-4" />
              <p className="text-stone-500 font-bold">暂无记录</p>
              <p className="text-stone-400 text-sm mt-2">快来成为第一个上榜的玩家吧！</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div key={index} className={`flex items-center p-3 rounded-xl ${index < 3 ? 'bg-yellow-50' : 'bg-stone-50'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-300 text-white' : index === 2 ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="font-black text-stone-800">{entry.name}</div>
                    <div className="text-xs text-stone-400">{entry.date}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="font-black text-orange-600 text-lg">${entry.score}</div>
                    <div className={`text-xs font-bold ${entry.popularity > 0 ? 'text-red-500' : 'text-stone-400'}`}>
                      人气: {entry.popularity}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 最高分记录UI
  if (showHighScore) {
    const highScore = getHighScore();
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Star className="w-8 h-8 text-blue-500" />
              <h2 className="text-2xl font-black text-stone-800">我的分数</h2>
            </div>
            <button onClick={() => { setShowHighScore(false); setShowHomepage(true); }} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200">
              <XCircle className="w-6 h-6 text-stone-500" />
            </button>
          </div>

          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Star className="w-10 h-10 text-blue-500 fill-current" />
            </div>
            <div className="text-5xl font-black text-blue-600 mb-2">${highScore}</div>
            <div className="text-stone-500 font-bold">历史最高分</div>
            {highScore === 0 && (
              <p className="text-stone-400 text-sm mt-4">开始游戏来创造你的最高分吧！</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 进入排行榜的名字输入UI
  if (showNameEntry) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2rem] shadow-2xl p-6">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-stone-800">恭喜上榜！</h2>
            <p className="text-stone-500 mt-2">你的分数 ${pendingScore} 进入了排行榜！</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-2">输入你的昵称</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="请输入昵称"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 font-bold text-center focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                if (playerName.trim()) {
                  saveToLeaderboard(playerName.trim(), pendingScore, pendingPopularity);
                  setShowNameEntry(false);
                  setShowLeaderboard(true);
                  setPlayerName('');
                }
              }}
              disabled={!playerName.trim()}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 text-white font-black py-3 rounded-xl text-lg disabled:cursor-not-allowed"
            >
              保存到排行榜
            </button>
            <button
              onClick={() => {
                setShowNameEntry(false);
                setShowHomepage(true);
                setPlayerName('');
              }}
              className="w-full bg-stone-200 hover:bg-stone-300 text-stone-600 font-black py-3 rounded-xl text-lg"
            >
              稍后再说
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 游戏进行中或结束 - 重定向到首页
  if (state.gameStatus === 'idle' || state.gameStatus === 'ended') {
    return <></>;
  }

  return (
    <div className={`kitchen-game flex flex-col font-sans select-none ${state.isPaused ? 'game-paused' : ''}`}>

      
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

      <main className="kitchen-layout">
        <section className="supply-section" aria-label="进货与仓库">
          <div className="supply-headings">
            <h2><ShoppingCart />进货</h2><h2><Package />仓库</h2>
          </div>
          <div className="supply-shelves">
            {(Object.keys(INGREDIENTS) as IngredientId[]).sort((a, b) => INGREDIENTS[a].price - INGREDIENTS[b].price).map(id => {
              const ing = INGREDIENTS[id];
              const pending = state.pendingDeliveries.filter(d => d.ingredientId === id);
              const isFull = state.inventory[id] + pending.length >= 10;
              const cannotBuy = state.money < ing.price || isFull || state.isPaused;
              return <div key={id} className="supply-line">
                <button className="supply-buy" type="button" onClick={() => buyIngredient(id)} disabled={cannotBuy}
                  aria-label={`购买${ing.name}，${ing.price}金币`}
                  title={isFull ? '库存已满（含配送中）' : `${ing.name} · 配送 ${ing.deliveryTime} 秒`}>
                  <span className="supply-icon" aria-hidden="true">{ing.icon}</span>
                  <span className="supply-label"><strong>{ing.name}</strong><b>${ing.price}</b></span>
                  <DeliveryClock deliveries={pending} duration={ing.deliveryTime} />
                </button>
                <StockShelf ingredient={ing} count={state.inventory[id]} disabled={state.isPaused}
                  flashing={flashingIngredients.includes(id)} onSell={() => sellIngredient(id)} />
              </div>;
            })}
          </div>
          <div className="fridge-foot" aria-hidden="true"><span /><span /><span /></div>
        </section>

        {/* Menu & Kitchen Section (Center) */}
        <div className="menu-kitchen">
          {/* Menu Section */}
          <section className="menu-board">
            <div className="bg-stone-700 px-2 py-1 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-orange-300" /><h2 className="text-[13px] font-black uppercase tracking-wider truncate">菜单</h2></div>
            </div>
            <div className="recipe-grid">
              {[...RECIPES].sort((a, b) => a.salePrice - b.salePrice).map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} inventory={state.inventory}
                  hasOrder={state.activeOrders.some(order => order.dishId === recipe.id)}
                  paused={state.isPaused} onCook={() => startCooking(recipe)} />
              ))}
            </div>
          </section>

          {/* Cooking Section */}
          <section className="stove-section flex flex-col p-1">
            <div className="flex-1 flex gap-1">
              {state.stoves.map(stove => {
                const activeRecipe = RECIPES.find(r => r.id === stove.dishId);
                const isInstalling = stove.installTimeLeft > 0;
                const canInstall = !stove.isInstalled && !isInstalling && state.money >= STOVE_INSTALL_COST;
                
                return (
                  <div key={stove.id} className={`flex-1 relative px-1 py-1 rounded-lg border flex items-center shadow-inner group overflow-hidden transition-all ${
                    !stove.isInstalled 
                      ? 'bg-stone-100 border-dashed border-stone-300' 
                      : 'bg-stone-50/50 border-stone-100'
                  }`}>
                    {/* 未安装的灶台 - 显示+号和安装按钮 */}
                    {!stove.isInstalled ? (
                      isInstalling ? (
                        // 正在安装中
                        <div className="w-full flex flex-col items-center justify-center gap-1">
                          <div className="text-lg animate-pulse">🔧</div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[8px] font-black text-orange-600">安装中...</span>
                            <span className="text-[10px] font-black text-orange-500">{stove.installTimeLeft}s</span>
                          </div>
                          <div className="w-full bg-stone-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all" style={{ width: `${((STOVE_INSTALL_TIME - stove.installTimeLeft) / STOVE_INSTALL_TIME) * 100}%` }} />
                          </div>
                        </div>
                      ) : (
                        // 未安装 - 三行文字均匀居中
                        <button 
                          onClick={() => installStove(stove.id)}
                          disabled={state.isPaused || state.money < STOVE_INSTALL_COST}
                          className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-all ${
                            state.money >= STOVE_INSTALL_COST && !state.isPaused
                              ? 'cursor-pointer hover:bg-orange-50 active:scale-95' 
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-[12px] font-bold text-stone-400 uppercase">安装灶台</span>
                          <span className={`text-[12px] font-black ${state.money >= STOVE_INSTALL_COST ? 'text-green-600' : 'text-red-500'}`}>
                            ${STOVE_INSTALL_COST}
                          </span>
                          <span className="text-[12px] text-stone-400 font-medium">⏱{STOVE_INSTALL_TIME}秒</span>
                        </button>
                      )
                    ) : stove.isCooking ? (
                      // 烹饪中 - 四行布局：图标、菜名、时间条、取消按钮
                      <div className="w-full flex flex-col items-center justify-center gap-0.5 animate-in slide-in-from-bottom-1 duration-200 h-full py-0.5">
                        {/* 第一排：菜品图标 */}
                        <div className="text-xl shrink-0">{activeRecipe?.icon}</div>
                        {/* 第二排：菜名 */}
                        <span className="text-[11px] font-black text-stone-700">{activeRecipe?.name}</span>
                        {/* 第三排：进度条和倒计时 */}
                        <div className="w-full flex items-center gap-1 px-1">
                          <div className="flex-1 bg-stone-200 h-1.5 rounded-full overflow-hidden border border-white">
                            <div className="bg-gradient-to-r from-orange-400 to-red-600 h-full" style={{ width: `${stove.progress}%` }} />
                          </div>
                          <span className="bg-orange-600 text-white px-1 rounded-sm font-black text-[9px] shadow-sm animate-pulse shrink-0">{stove.timeRemaining}s</span>
                        </div>
                        {/* 第四排：关闭按钮 */}
                        <button onClick={() => cancelCooking(stove.id)} disabled={state.isPaused} className={`text-red-400 hover:text-red-600 transition-colors ${state.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : stove.isDone ? (
                      // 已做好 - 显示菜品和上菜/丢弃按钮
                      <div className="w-full flex flex-col items-center justify-center gap-0.5 h-full py-0.5">
                        {/* 菜品图标 */}
                        <div className="text-xl shrink-0 relative">
                          {activeRecipe?.icon}
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-[8px]">✓</span>
                          </div>
                        </div>
                        {/* 菜名 */}
                        <span className="text-[11px] font-black text-green-700">{activeRecipe?.name}</span>
                        {/* 已做好标签 */}
                        <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 rounded">已做好</span>
                        {/* 丢弃按钮 */}
                        <button onClick={() => discardDish(stove.id)} disabled={state.isPaused} className={`text-stone-400 hover:text-red-500 transition-colors ${state.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`} title="丢弃菜品">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      // 空闲灶台
                      <div className="w-full text-center opacity-15 text-[17px] font-black uppercase tracking-widest flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> 灶台</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Orders Section (Right) */}
        <section className="orders-section flex flex-col">
          <div className="bg-stone-700 px-2 py-1 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-300" /><h2 className="text-[13px] font-black uppercase tracking-wider truncate">订单</h2></div>
            <span className="bg-white/20 text-[8px] px-1.5 rounded-full font-black">{state.activeOrders.length}</span>
          </div>
            <div className="order-list">
              {state.activeOrders.map(order => {
                const recipe = RECIPES.find(r => r.id === order.dishId)!;
                // 最后20秒是催单区间
                const isUrgent = order.expiryTime <= 20;
                // 最左边20秒轻微区分 (expiryTime > 60)
                const isNew = order.expiryTime > 60;
                // 订单是否正在制作中
                const isCooking = order.isCooking;
                const displayTime = order.expiryTime;
                const maxTime = 80; // 统一80秒
                const progressWidth = (displayTime / maxTime) * 100;
                const canCook = Object.entries(recipe.ingredients).every(([ingId, count]) => state.inventory[ingId as IngredientId] >= (count || 0));
                const hasFreeStove = state.stoves.some(s => s.isInstalled && !s.isCooking && !s.isDone);
                const canStart = canCook && hasFreeStove && !state.isPaused && !isCooking;
                // 检查灶台上是否有对应的已做好的菜品
                const hasReadyDish = state.stoves.some(s => s.isDone && s.dishId === order.dishId);
                const canServe = hasReadyDish && !state.isPaused;
                return (
                  <div key={order.id} className={`order-ticket flex flex-col p-1.5 rounded-lg border transition-all shadow-sm ${isUrgent ? 'border-red-600 bg-red-50 animate-pulse' : isNew ? 'border-blue-200 bg-blue-50/50' : 'border-stone-50'}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <div className="text-2xl shrink-0"><DishArtwork icon={recipe.icon} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="font-black text-stone-800 text-[9px] leading-tight truncate">{recipe.name}</span>
                          {isCooking && (
                            <span className="text-stone-500 bg-stone-100 px-1 rounded shrink-0 text-[7px] font-black">制作中</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[7px] font-black uppercase">
                           <span className={isUrgent ? 'text-red-600 font-bold' : isNew ? 'text-blue-500' : 'text-stone-400'}>{isUrgent ? `催单! ${displayTime}s` : `${displayTime}s`}</span>
                           <span className={order.type === 'blogger' ? 'text-purple-500' : 'text-stone-300'}>{order.type === 'blogger' ? '博主' : '普通'}</span>
                        </div>
                      </div>
                      {canServe ? (
                        <button 
                          onClick={() => serveDish(order.id)}
                          className="ml-1 px-2 py-0.5 bg-blue-500 hover:bg-blue-600 text-white text-[8px] font-black rounded shadow-sm active:scale-95 transition-transform animate-pulse"
                        >
                          上菜
                        </button>
                      ) : (
                        <CookButton hasIngredients={canCook} hasOrder={true} disabled={!canStart}
                          onClick={() => acceptOrder(order)} label={isCooking ? '制作中' : '烹饪'}
                          title={state.isPaused ? '游戏已暂停' : isCooking ? '正在制作' : !canCook ? '食材不足' : !hasFreeStove ? '没有可用的灶台' : '接受订单并烹饪'} />
                      )}
                    </div>
                    <div className="w-full bg-stone-100 h-1 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-red-600 animate-pulse' : isNew ? 'bg-blue-400' : 'bg-orange-400'}`} style={{ width: `${progressWidth}%` }} /></div>
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
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { 
            setShowRules(false); 
            if (state.gameStatus === 'playing') setState(prev => ({ ...prev, isPaused: false })); 
            if (state.gameStatus !== 'playing') setShowHomepage(true);
          }}
        >
          <div 
            className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-orange-200 animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-orange-600 text-white px-6 py-4 border-b-4 border-orange-700 z-10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-2xl font-black uppercase tracking-wider">游戏规则</h2>
              </div>
            </div>
            <div className="p-6 space-y-6 text-stone-800">
              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">游戏目标</h3>
                <p className="text-base leading-relaxed">在规定的5分钟内，让店铺赚取最多的钱。但要注意：<strong className="text-red-600">人气值不能降到0%</strong>，否则游戏失败！</p>
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
                      <li>- 80-100% 人气：同时最多4个订单</li>
                      <li>- 60-80% 人气：同时最多3个订单</li>
                      <li>- 40-60% 人气：同时最多2个订单</li>
                      <li>- 40% 以下：同时最多1个订单</li>
                    </ul>
                  </li>
                  <li>• <strong>失败条件：</strong>人气值降到0%</li>
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
                  <li>• <strong>配送进度：</strong>圆形时钟显示最近一件配送进度，角标显示待到货数量</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">灶台系统</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>初始灶台：</strong>游戏开始时拥有2个灶台</li>
                  <li>• <strong>最大灶台：</strong>最多可扩展至4个灶台</li>
                  <li>• <strong>安装费用：</strong>安装一个新灶台需要${STOVE_INSTALL_COST}金币</li>
                  <li>• <strong>安装时间：</strong>安装新灶台需要${STOVE_INSTALL_TIME}秒</li>
                  <li>• <strong>点击+号：</strong>点击空置灶台位置可以安装新灶台</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">做菜规则</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>点击菜谱卡片：</strong>翻面查看食材和时间；点击烹饪按钮开始制作</li>
                  <li>• <strong>食材需求：</strong>必须拥有足够的食材才能开始烹饪</li>
                  <li>• <strong>烹饪时间：</strong>不同菜品需要不同的烹饪时间（秒）</li>
                  <li>• <strong>灶台数量：</strong>同时最多在已安装的灶台上烹饪</li>
                  <li>• <strong>取消烹饪：</strong>可以点击X按钮取消，但食材会损耗</li>
                  <li>• <strong>完成烹饪：</strong>如果有对应订单，自动完成并获得收入</li>
                  <li>• <strong>无订单：</strong>如果完成时没有对应订单，菜品浪费</li>
                  <li>• <strong>价格排序：</strong>菜谱按售价从低到高排列</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-orange-600 mb-3 uppercase">订单规则</h3>
                <ul className="space-y-2 text-base">
                  <li>• <strong>订单生成：</strong>随机生成，有时间限制（20-50秒）</li>
                  <li>• <strong>订单类型：</strong>普通、博主、挑剔、豪爽四种顾客类型</li>
                  <li>• <strong>完成方式：</strong>烹饪对应菜品后自动完成</li>
                  <li>• <strong>超时处理：</strong>订单时间到后进入紧急催单状态（20秒），每2秒扣1点人气值，超时后订单消失并扣除额外人气值</li>
                  <li>• <strong>紧急提示：</strong>剩余时间少于15秒或处于催单状态时，订单会闪烁红色</li>
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
