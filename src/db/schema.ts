export const DB_NAME = "planer-diety-db";
export const DB_VERSION = 7;

export const STORE = {
  META: "meta",
  DIET_DAYS: "dietDays",
  DAY_STATUSES: "dayStatuses",
  MEAL_STATUSES: "mealStatuses",
  DAY_LOGS: "dayLogs",
  MEAL_LOGS: "mealLogs",
  SHOPPING_STATES: "shoppingStates",
  SHOPPING_MANUAL_ITEMS: "shoppingManualItems",
  PANTRY_ITEMS: "pantryItems",
  INVENTORY_CATALOG: "inventoryCatalog",
  INVENTORY_ITEMS: "inventoryItems",
  INVENTORY_OPERATIONS: "inventoryOperations",
  SETTINGS: "settings",
  NOTES: "notes"
} as const;

export const SETTINGS_KEY = "appSettings";
