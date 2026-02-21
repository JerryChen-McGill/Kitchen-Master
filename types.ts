
export type IngredientId = 'tomato' | 'lettuce' | 'onion' | 'meat' | 'bread' | 'cheese' | 'potato';

export interface Ingredient {
  id: IngredientId;
  name: string;
  price: number;
  icon: string;
  deliveryTime: number; // seconds to arrive
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Partial<Record<IngredientId, number>>;
  cookingTime: number;
  salePrice: number;
  icon: string;
}

export interface Stove {
  id: number;
  isInstalled: boolean;
  installTimeLeft: number; // 安装剩余时间（0表示已完成安装）
  isCooking: boolean;
  dishId: string | null;
  timeRemaining: number;
  progress: number;
}

export type CustomerType = 'normal' | 'blogger' | 'grumpy' | 'happy';

export interface Order {
  id: string;
  dishId: string;
  expiryTime: number;
  maxTime: number; // The initial expiry time
  type: CustomerType;
  isUrgent: boolean; // Whether the order is in urgent reminder state
  urgentTimeLeft: number; // Time left in urgent state (20 seconds)
}

export interface PendingDelivery {
  id: string;
  ingredientId: IngredientId;
  timeLeft: number;
}

export interface GameState {
  money: number;
  inventory: Record<IngredientId, number>;
  stoves: Stove[];
  activeOrders: Order[];
  pendingDeliveries: PendingDelivery[];
  totalRevenue: number;
  popularity: number;
  timeLeft: number;
  gameStatus: 'idle' | 'playing' | 'ended';
  isPaused: boolean;
}
