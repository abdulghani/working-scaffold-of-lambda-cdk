import { Action } from "@/constants/action";
import { OrderInstance } from "app/service/order";
import { createInstanceId, parseInstanceId } from "./order-helper";

/** HASH MENU ADDON, [MENU-ID]-[ADDON-ID-1]-[ADDON-ID-2] */

export type OrderDraftShape = { [key: string]: OrderInstance };

export function orderDraftReducer(
  state: OrderDraftShape,
  action: Action
): OrderDraftShape {
  switch (action.type) {
    case "CLEAR_COOKIE": {
      return {};
    }
    case "FLUSH_INSTANCE_TEMP": {
      const { instance_id, instance } = action.data;

      const targetId = createInstanceId(instance.menu_id, instance.addon_ids);
      const qty =
        instance_id !== targetId && state[targetId]?.qty
          ? state[targetId].qty + instance.qty
          : instance.qty;
      const notes = instance.notes?.trim()
        ? instance.notes
        : state[targetId]?.notes;

      state[targetId] = {
        ...instance,
        qty,
        notes
      };
      if (instance_id !== targetId) {
        delete state[instance_id];
      }

      return orderDraftReducer(state, { type: "CLEAR_EMPTY" });
    }
    case "FLUSH_MENU_TEMP": {
      const { instance } = action.data;

      const targetId = createInstanceId(instance.menu_id, instance.addon_ids);
      const qty = (state?.[targetId]?.qty || 0) + instance.qty;

      state[targetId] = {
        ...instance,
        qty
      };

      return orderDraftReducer(state, { type: "CLEAR_EMPTY" });
    }
    case "SET_INSTANCE_NOTES": {
      const { instance_id, notes } = action.data;

      return {
        ...state,
        [instance_id]: {
          ...(state[instance_id] || {}),
          notes
        }
      };
    }
    case "CLEAR_EMPTY": {
      const { menuMap } = action.data || {};

      Object.entries(state || {}).forEach(([key, instance]) => {
        if (instance.qty <= 0 || (menuMap && !menuMap[instance.menu_id])) {
          delete state[key];
        }
      });

      return structuredClone(state);
    }
    case "SET_INTANCE_QTY": {
      const { instance_id, qty } = action.data;
      const { menuId, addonIds } = parseInstanceId(instance_id);

      return {
        ...state,
        [instance_id]: {
          ...(state[instance_id] || {}),
          qty,
          menu_id: menuId,
          addon_ids: addonIds
        }
      };
    }
    default: {
      return structuredClone(state);
    }
  }
}
