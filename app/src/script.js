import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";
import { hexToAscii, asciiToHex, fromWei } from "web3-utils";
import BigNumber from "bignumber.js";

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

const handleCreateMarket = async (event) => {
    const { returnValues } = event;
    const {
        conditionId,
        number,
        creator,
        oracle,
        question,
        outcomes: rawOutcomes,
        timestamp,
        endsAt,
    } = returnValues;

    const outcomes = [];
    const collateralTokenAddress = await app.call("weth9Token").toPromise();
    for (let i = 0; i < rawOutcomes.length; i++) {
        const collectionId = await app
            .call("getCollectionId", asciiToHex(""), conditionId, i)
            .toPromise();
        const positionId = await app
            .call("getPositionId", collateralTokenAddress, collectionId)
            .toPromise();
        const balance = await app.call("balanceOf", positionId).toPromise();
        const price = await app
            .call("getMarginalPrice", conditionId, i)
            .toPromise();
        outcomes.push({
            label: hexToAscii(removeTrailingZeroes(rawOutcomes[i])),
            holding: fromWei(balance),
            price: new BigNumber(price)
                .dividedBy(new BigNumber("2").pow("64"))
                .toString(),
        });
    }
    return {
        conditionId,
        number,
        creator,
        oracle,
        question: hexToAscii(removeTrailingZeroes(question)),
        outcomes,
        timestamp: parseInt(timestamp),
        endsAt: parseInt(endsAt),
        open: true,
    };
};

const handleCloseMarket = (event, markets) => {
    const { returnValues } = event;
    const { conditionId } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    if (marketIndex >= 0) {
        markets[marketIndex].open = false;
    }
    return [...markets];
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
                    await handleCreateMarket(action),
                ],
            };
        }
        case "CloseMarket": {
            return {
                ...state,
                markets: handleCloseMarket(action, state.markets || []),
            };
        }
        default: {
            return state;
        }
    }
});
