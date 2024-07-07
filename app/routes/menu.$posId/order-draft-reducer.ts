import { Action } from "@/constants/action";
import { OrderInstance } from "app/service/order";
import { createInstanceId, parseInstanceId } from "./order-helper";

/** HASH MENU ADDON, [MENU-ID]-[ADDON-ID-1]-[ADDON-ID-2] */

export type OrderDraftShape = {
  pos_id: string;
  name?: string;
  phone?: string;
  instance_record_json: OrderInstance;
};

export function orderDraftReducer(
  state: OrderDraftShape,
  action: Action
): OrderDraftShape {
  switch (action.type) {
    case "FLUSH_INSTANCE_TEMP": {
      const { instance_id, instance } = action.data;

      const targetId = createInstanceId(instance.menu_id, instance.addon_ids);
      const qty =
        instance_id !== targetId && state.instance_record_json[targetId]?.qty
          ? state.instance_record_json[targetId].qty + instance.qty
          : instance.qty;
      const notes = instance.notes?.trim()
        ? instance.notes
        : state.instance_record_json[targetId]?.notes;

      state.instance_record_json[targetId] = {
        ...instance,
        qty,
        notes
      };
      if (instance_id !== targetId) {
        delete state.instance_record_json[instance_id];
      }

      return orderDraftReducer(state, { type: "CLEAR_EMPTY" });
    }
    case "SET_INSTANCE_NOTES": {
      const { instance_id, notes } = action.data;

      return {
        ...state,
        instance_record_json: {
          ...(state.instance_record_json || {}),
          [instance_id]: {
            ...(state.instance_record_json?.[instance_id] || {}),
            notes
          }
        }
      };
    }
    case "CLEAR_EMPTY": {
      Object.entries(state.instance_record_json || {}).forEach(
        ([key, instance]) => {
          if (instance.qty <= 0) {
            delete state.instance_record_json?.[key];
          }
        }
      );

      return structuredClone(state);
    }
    case "SET_INTANCE_QTY": {
      const { instance_id, qty } = action.data;
      const { menuId, addonIds } = parseInstanceId(instance_id);

      return {
        ...state,
        instance_record_json: {
          ...(state.instance_record_json || {}),
          [instance_id]: {
            ...(state.instance_record_json?.[instance_id] || {}),
            qty,
            menu_id: menuId,
            addon_ids: addonIds
          }
        }
      };
    }
    case "SET_NAME": {
      return {
        ...structuredClone(state),
        name: action.data
      };
    }
    case "SET_PHONE": {
      return {
        ...structuredClone(state),
        phone: action.data
      };
    }
    default: {
      return structuredClone(state);
    }
  }
}
