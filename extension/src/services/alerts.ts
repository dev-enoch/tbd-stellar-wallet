export type AlertCondition = 'above' | 'below' | 'pct_change';

export interface PriceAlert {
  id: string;
  assetCode: string;
  condition: AlertCondition;
  targetValue: number;
  initialPrice?: number;
  createdAt: number;
  triggeredAt?: number;
  active: boolean;
  notes?: string;
}

const ALERTS_STORAGE_KEY = 'tbd_price_alerts';
let memoryAlerts: PriceAlert[] = [];

/**
 * Retrieves all stored price alerts from local storage.
 */
export function getStoredAlerts(): PriceAlert[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return memoryAlerts;
}

/**
 * Persists price alerts to storage.
 */
export function saveStoredAlerts(alerts: PriceAlert[]): void {
  memoryAlerts = [...alerts];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    }
  } catch {
    // storage full
  }
}

/**
 * Creates and registers a new price alert.
 */
export function createPriceAlert(params: {
  assetCode: string;
  condition: AlertCondition;
  targetValue: number;
  currentPrice?: number;
  notes?: string;
}): PriceAlert {
  const alerts = getStoredAlerts();
  const newAlert: PriceAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    assetCode: params.assetCode.toUpperCase(),
    condition: params.condition,
    targetValue: params.targetValue,
    initialPrice: params.currentPrice,
    createdAt: Date.now(),
    active: true,
    notes: params.notes,
  };

  alerts.unshift(newAlert);
  saveStoredAlerts(alerts);
  return newAlert;
}

/**
 * Deletes a price alert by ID.
 */
export function deletePriceAlert(id: string): void {
  const alerts = getStoredAlerts().filter((a) => a.id !== id);
  saveStoredAlerts(alerts);
}

/**
 * Toggles an alert active state.
 */
export function togglePriceAlert(id: string, active: boolean): void {
  const alerts = getStoredAlerts().map((a) => {
    if (a.id === id) {
      return { ...a, active };
    }
    return a;
  });
  saveStoredAlerts(alerts);
}

/**
 * Checks price alerts against latest market prices.
 * Returns any alerts that were triggered in this check.
 */
export function evaluatePriceAlerts(
  marketPrices: Record<string, number>
): PriceAlert[] {
  const alerts = getStoredAlerts();
  const triggered: PriceAlert[] = [];
  const updatedAlerts: PriceAlert[] = [];

  for (const alert of alerts) {
    if (!alert.active || alert.triggeredAt) {
      updatedAlerts.push(alert);
      continue;
    }

    const currentPrice = marketPrices[alert.assetCode];
    if (currentPrice === undefined || currentPrice === null) {
      updatedAlerts.push(alert);
      continue;
    }

    let isTriggered = false;

    if (alert.condition === 'above' && currentPrice >= alert.targetValue) {
      isTriggered = true;
    } else if (alert.condition === 'below' && currentPrice <= alert.targetValue) {
      isTriggered = true;
    } else if (alert.condition === 'pct_change' && alert.initialPrice) {
      const pctChange =
        Math.abs((currentPrice - alert.initialPrice) / alert.initialPrice) * 100;
      if (pctChange >= alert.targetValue) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      const triggeredAlert = {
        ...alert,
        triggeredAt: Date.now(),
      };
      triggered.push(triggeredAlert);
      updatedAlerts.push(triggeredAlert);

      // Trigger browser notification if available
      if (typeof chrome !== 'undefined' && chrome.notifications && chrome.notifications.create) {
        chrome.notifications.create(alert.id, {
          type: 'basic',
          iconUrl: 'icon-128.png',
          title: `Stellith Price Alert: ${alert.assetCode}`,
          message: `${alert.assetCode} is now $${currentPrice.toFixed(4)} (${alert.condition} $${alert.targetValue})`,
          priority: 2,
        });
      }
    } else {
      updatedAlerts.push(alert);
    }
  }

  saveStoredAlerts(updatedAlerts);
  return triggered;
}
