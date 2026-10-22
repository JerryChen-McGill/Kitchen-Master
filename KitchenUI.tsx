import React, { useState } from 'react';
import { ChefHat, Clock, Plus } from 'lucide-react';
import { INGREDIENTS } from './constants';
import { Ingredient, IngredientId, PendingDelivery, Recipe } from './types';

// Presentation only: both cooking entry points share the same four color states.
export const cookingTone = (hasIngredients: boolean, hasOrder: boolean) =>
  hasOrder ? (hasIngredients ? 'ordered' : 'ordered-missing') : (hasIngredients ? 'ready' : 'missing');

export function DishArtwork({ icon }: { icon: string }) {
  const [main, ...extras] = Array.from(icon);
  return <span className="dish-artwork" aria-hidden="true"><span>{main}</span>
    {extras.length > 0 && <span className="dish-garnish">{extras.join('')}</span>}
  </span>;
}

export function CookButton({ hasIngredients, hasOrder, disabled, onClick, title, label = '烹饪' }: {
  hasIngredients: boolean; hasOrder: boolean; disabled: boolean;
  onClick: () => void; title?: string; label?: string;
}) {
  return <button type="button" className={`cook-button cook-${cookingTone(hasIngredients, hasOrder)}`}
    disabled={disabled} onClick={onClick} title={title}>
    <ChefHat aria-hidden="true" /><span>{label}</span>
  </button>;
}

export function DeliveryClock({ deliveries, duration }: { deliveries: PendingDelivery[]; duration: number }) {
  const next = deliveries.reduce<PendingDelivery | undefined>((first, item) =>
    !first || item.timeLeft < first.timeLeft ? item : first, undefined);
  if (!next) return <span className="supply-add" aria-hidden="true"><Plus /></span>;
  const progress = Math.max(0, Math.min(1, (duration - next.timeLeft) / duration));
  const nextProgress = Math.min(1, progress + 1 / duration);
  return <span className="delivery-clock" role="img"
    aria-label={`配送中 ${deliveries.length} 件，下一件 ${next.timeLeft} 秒后到货`}>
    <svg key={`${next.id}-${next.timeLeft}`} viewBox="0 0 40 40" aria-hidden="true" style={{
      '--clock-offset-end': 100 - nextProgress * 100,
      '--clock-angle-start': `${progress * 360}deg`,
      '--clock-angle-end': `${nextProgress * 360}deg`,
    } as React.CSSProperties}>
      <circle className="clock-face" cx="20" cy="20" r="17" />
      <circle className="clock-progress" cx="20" cy="20" r="17" pathLength="100"
        strokeDasharray="100" strokeDashoffset={100 - progress * 100} transform="rotate(-90 20 20)" />
      <path className="clock-hand" d="M20 20V8" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
    <span className="delivery-count">×{deliveries.length}</span>
  </span>;
}

export function StockShelf({ ingredient, count, disabled, onSell }: {
  ingredient: Ingredient; count: number; disabled: boolean; onSell: () => void;
}) {
  return <button type="button" className="stock-shelf"
    onClick={onSell} disabled={disabled || count === 0}
    aria-label={`${ingredient.name} 库存 ${count}，点击半价卖出一件`} title={`${ingredient.name} ×${count} · 点击半价卖出一件`}>
    <span className="stock-count">×{count}</span>
    <span className="stock-slots" aria-hidden="true">
      {Array.from({ length: 5 }, (_, slot) => {
        const quantity = slot < 4 ? Number(count > slot) : Math.max(0, count - 4);
        return <span key={slot} className={`stock-slot ${quantity > 1 ? 'stock-stack' : ''}`}>
          {Array.from({ length: quantity }, (_, index) => <span key={index} className="stock-item">{ingredient.icon}</span>)}
        </span>;
      })}
    </span>
  </button>;
}

export function RecipeCard({ recipe, inventory, hasOrder, paused, onCook, onInspect }: {
  recipe: Recipe; inventory: Record<IngredientId, number>; hasOrder: boolean; paused: boolean; onCook: () => void; onInspect: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const enough = Object.entries(recipe.ingredients).every(([id, count]) => inventory[id as IngredientId] >= (count || 0));
  return <article className={`recipe-card ${flipped ? 'is-flipped' : ''}`} data-recipe={recipe.id}>
    <button type="button" className="recipe-flip" onClick={() => {
      setFlipped(value => !value);
      onInspect();
    }}
      aria-label={`${recipe.name}：${flipped ? '返回正面' : '查看食材和烹饪时间'}`} aria-pressed={flipped}
      title="点击翻面" disabled={paused}>
      <span className="recipe-turn">
        <span className="recipe-face recipe-front" aria-hidden={flipped}>
          <span className="dish-picture"><DishArtwork icon={recipe.icon} /></span>
          <span className="dish-name">{recipe.name}</span>
          <span className="dish-price">${recipe.salePrice}</span>
        </span>
        <span className="recipe-face recipe-back" aria-hidden={!flipped}>
          <span className="recipe-ingredients">
            {Object.entries(recipe.ingredients).map(([id, count]) => <span key={id}
              className={`recipe-ingredient ${inventory[id as IngredientId] < (count || 0) ? 'ingredient-missing' : ''}`}
              title={`${INGREDIENTS[id as IngredientId].name} ×${count}`}>
              <span>{INGREDIENTS[id as IngredientId].icon}</span><small>×{count}</small>
            </span>)}
          </span>
          <span className="recipe-time"><Clock aria-hidden="true" />{recipe.cookingTime}秒</span>
        </span>
      </span>
    </button>
    <CookButton hasIngredients={enough} hasOrder={hasOrder} disabled={paused}
      onClick={onCook} title={paused ? '游戏已暂停' : !enough ? '食材不足，点击查看缺少的食材' : hasOrder ? '有订单需要这道菜' : '开始烹饪'} />
  </article>;
}
