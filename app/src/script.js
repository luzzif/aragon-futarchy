import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";
import { hexToAscii } from "web3-utils";

const app = new Aragon();

const removeTrailingZeroes = (string) => {
    if (!string) {
        return string;
    }
    let numberOfTrailingZeroes = 0;
    let i = string.length - 1;
    while (i !== 0) {
        const character = string.charAt(i);
        if (character !== "0") {
            break;
        }
        numberOfTrailingZeroes++;
        i--;
    }
    return string.substring(0, string.length - numberOfTrailingZeroes);
};

const eventValuesToMarket = async (event) => {
    const { returnValues } = event;
    const {
        conditionId,
        number,
        creator,
        oracle,
        question,
        outcomes,
        timestamp,
    } = returnValues;
    const payoutNumerators = [];
    for (let i = 0; i < outcomes.length; i++) {
        payoutNumerators.push(
            parseInt(
                await app
                    .call("getPayoutNumerators", conditionId, i)
                    .toPromise()
            )
        );
    }
    const totalShares = payoutNumerators.reduce(
        (totalShares, numerator) => totalShares + numerator,
        0
    );
    const odds = payoutNumerators.reduce((odds, numerator) => {
        odds.push(totalShares > 0 ? numerator / totalShares : 0);
        return odds;
    }, []);
    return {
        conditionId,
        number,
        creator,
        oracle,
        question: hexToAscii(removeTrailingZeroes(question)),
        outcomes: outcomes.map(removeTrailingZeroes).map(hexToAscii),
        odds,
        timestamp: parseInt(timestamp),
    };
};

app.store(async (state, action) => {
    const { event } = action;
    switch (event) {
        case events.SYNC_STATUS_SYNCING: {
            return { ...state, syncing: true };
        }
        case events.SYNC_STATUS_SYNCED: {
            return { ...state, syncing: false };
        }
        case "CreateMarket": {
            return {
                ...state,
                markets: [
                    ...(state.markets || []),
                    await eventValuesToMarket(action),
                ],
            };
        }
        default: {
            return state;
        }
    }
});
