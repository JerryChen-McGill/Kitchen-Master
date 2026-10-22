
import { Ingredient, Recipe, IngredientId } from './types';

export const GAME_DURATION = 300; // 5 minutes
export const INITIAL_MONEY = 100; 
export const STOVE_COUNT = 4; // 最大灶台数
export const INITIAL_STOVES = 2; // 初始可用灶台数
export const STOVE_INSTALL_COST = 100; // 安装一个新灶台的费用
export const STOVE_INSTALL_TIME = 40; // 安装一个新灶台需要的时间（秒）

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  tomato: { id: 'tomato', name: '番茄', price: 6, icon: '🍅', deliveryTime: 12 },
  lettuce: { id: 'lettuce', name: '生菜', price: 4, icon: '🥬', deliveryTime: 8 },
  onion: { id: 'onion', name: '洋葱', price: 3, icon: '🧅', deliveryTime: 6 },
  meat: { id: 'meat', name: '牛肉饼', price: 24, icon: '🥩', deliveryTime: 25 },
  bread: { id: 'bread', name: '汉堡胚', price: 9, icon: '🥯', deliveryTime: 15 },
  cheese: { id: 'cheese', name: '芝士', price: 12, icon: '🧀', deliveryTime: 18 },
  potato: { id: 'potato', name: '土豆', price: 6, icon: '🥔', deliveryTime: 12 },
};

export const RECIPES: Recipe[] = [
  {
    id: 'fries',
    name: '炸薯条',
    ingredients: { potato: 2 },
    cookingTime: 8,
    salePrice: 25,
    icon: '🍟'
  },
  {
    id: 'salad',
    name: '田园沙拉',
    ingredients: { tomato: 2, lettuce: 2, onion: 1 },
    cookingTime: 6,
    salePrice: 48, 
    icon: '🥗'
  },
  {
    id: 'burger',
    name: '经典汉堡',
    ingredients: { bread: 1, meat: 1, lettuce: 1 },
    cookingTime: 12,
    salePrice: 68,
    icon: '🍔'
  },
  {
    id: 'cheeseburger',
    name: '芝士堡',
    ingredients: { bread: 1, meat: 1, cheese: 1, lettuce: 1 },
    cookingTime: 14,
    salePrice: 88,
    icon: '🍔🧀'
  },
  {
    id: 'pizza',
    name: '蔬菜披萨',
    ingredients: { bread: 1, tomato: 2, cheese: 1, onion: 1 },
    cookingTime: 20,
    salePrice: 78,
    icon: '🍕'
  },
  {
    id: 'steak',
    name: '牛排套餐',
    ingredients: { meat: 2, potato: 1 },
    cookingTime: 25,
    salePrice: 118,
    icon: '🥩🍟'
  }
];

export const getRecipeProfit = (recipe: Recipe): number => recipe.salePrice -
  Object.entries(recipe.ingredients).reduce((cost, [id, count]) =>
    cost + INGREDIENTS[id as IngredientId].price * (count ?? 0), 0);
