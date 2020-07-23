import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";

const app = new Aragon();

app.state(
    (state, action) => {
        console.log("new action", action);
        switch (action.event) {
            case events.SYNC_STATUS_SYNCING: {
                return { ...state, syncing: true };
            }
            case events.SYNC_STATUS_SYNCED: {
                return { ...state, syncing: false };
            }
            case "CreateMarket": {
                return { ...state, markets: [...state.markets, action.event] };
            }
            default: {
                return state;
            }
        }
    },
    {
        init: (cachedState) => ({
            ...cachedState,
        }),
    }
);
