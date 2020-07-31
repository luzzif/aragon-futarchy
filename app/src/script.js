import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";
import { hexToAscii, asciiToHex } from "web3-utils";
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

const getUpdatedOutcomesInformation = async (
    conditionId,
    outcomeLabels,
    results
) => {
    const outcomes = [];
    const collateralTokenAddress = await app.call("weth9Token").toPromise();
    for (let i = 0; i < outcomeLabels.length; i++) {
        const collectionId = await app
            .call("getCollectionId", asciiToHex(""), conditionId, i + 1)
            .toPromise();
        const positionId = await app
            .call("getPositionId", collateralTokenAddress, collectionId)
            .toPromise();
        const balance = await app.call("balanceOf", positionId).toPromise();
        const price = await app
            .call("getMarginalPrice", conditionId, i)
            .toPromise();
        outcomes.push({
            label: outcomeLabels[i],
            balance,
            price: new BigNumber(price)
                .dividedBy(new BigNumber("2").pow("64"))
                .toString(),
            correct: results && results[i] === "1",
        });
    }
    return outcomes;
};

const handleCreateMarket = async (event) => {
    const { returnValues } = event;
    const { conditionId, outcomes: outcomeLabels } = returnValues;
    const {
        creator,
        oracle,
        question,
        timestamp,
        endsAt,
        questionId,
    } = await app.call("marketData", conditionId).toPromise();
    return {
        conditionId,
        creator,
        oracle,
        question: hexToAscii(removeTrailingZeroes(question)),
        outcomes: await getUpdatedOutcomesInformation(
            conditionId,
            outcomeLabels.map(removeTrailingZeroes).map(hexToAscii)
        ),
        timestamp: parseInt(timestamp),
        endsAt: parseInt(endsAt),
        open: true,
        redeemed: false,
        questionId,
    };
};

const handleCloseMarket = async (event, markets) => {
    const { returnValues } = event;
    const { conditionId, results } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    if (marketIndex >= 0) {
        markets[marketIndex].open = false;
        markets[marketIndex].results = results;
        markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
            conditionId,
            markets[marketIndex].outcomes.map((outcome) => outcome.label),
            results
        );
    }
    return [...markets];
};

const handleTrade = async (event, markets) => {
    const { returnValues } = event;
    const { conditionId } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
        conditionId,
        markets[marketIndex].outcomes.map((outcome) => outcome.label)
    );
    return [...markets];
};

const handleRedeemPositions = async (event, markets) => {
    const { returnValues } = event;
    const { conditionId } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    markets[marketIndex].redeemed = true;
    markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
        conditionId,
        markets[marketIndex].outcomes.map((outcome) => outcome.label),
        markets[marketIndex].results
    );
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
                markets: await handleCloseMarket(action, state.markets || []),
            };
        }
        case "Trade": {
            return {
                ...state,
                markets: await handleTrade(action, state.markets),
            };
        }
        case "RedeemPositions": {
            return {
                ...state,
                markets: await handleRedeemPositions(action, state.markets),
            };
        }
        default: {
            return state;
        }
    }
});
