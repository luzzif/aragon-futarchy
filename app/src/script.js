import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";
import { hexToAscii } from "web3-utils";
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
    selectedAccount,
    conditionId,
    outcomeLabels,
    payouts,
    marginalPricesAtClosure
) => {
    const outcomes = [];
    const collateralTokenAddress = await app.call("weth9Token").toPromise();
    for (let i = 0; i < outcomeLabels.length; i++) {
        const collectionId = await app
            .call("getCollectionId", conditionId, i + 1)
            .toPromise();
        const positionId = await app
            .call("getPositionId", collateralTokenAddress, collectionId)
            .toPromise();
        const balance = await app
            .call("balanceOf", selectedAccount, positionId)
            .toPromise();
        let price;
        if (marginalPricesAtClosure && marginalPricesAtClosure[i]) {
            price = marginalPricesAtClosure[i];
        } else {
            price = await app
                .call("getMarginalPrice", conditionId, i)
                .toPromise();
        }
        outcomes.push({
            label: outcomeLabels[i],
            balance,
            price: new BigNumber(price)
                .dividedBy(new BigNumber("2").pow("64"))
                .toString(),
            correct: payouts && payouts[i] === "1",
        });
    }
    return outcomes;
};

const handleCreateMarket = async (event, selectedAccount) => {
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
            selectedAccount,
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

const handleCloseMarket = async (event, markets, selectedAccount) => {
    const { returnValues } = event;
    const { conditionId, payouts, marginalPricesAtClosure } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    if (marketIndex >= 0) {
        markets[marketIndex].open = false;
        markets[marketIndex].payouts = payouts;
        markets[marketIndex].marginalPricesAtClosure = marginalPricesAtClosure;
        markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
            selectedAccount,
            conditionId,
            markets[marketIndex].outcomes.map((outcome) => outcome.label),
            payouts,
            marginalPricesAtClosure
        );
    }
    return [...markets];
};

const handleTrade = async (event, markets, selectedAccount) => {
    const { returnValues } = event;
    const { conditionId } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
        selectedAccount,
        conditionId,
        markets[marketIndex].outcomes.map((outcome) => outcome.label)
    );
    return [...markets];
};

const handleRedeemPositions = async (event, markets, selectedAccount) => {
    const { returnValues } = event;
    const { conditionId } = returnValues;
    const marketIndex = markets.findIndex(
        (market) => market.conditionId === conditionId
    );
    markets[marketIndex].redeemed = true;
    markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
        selectedAccount,
        conditionId,
        markets[marketIndex].outcomes.map((outcome) => outcome.label),
        markets[marketIndex].payouts,
        markets[marketIndex].marginalPricesAtClosure
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
        case events.ACCOUNTS_TRIGGER: {
            return { ...state, selectedAccount: action.returnValues.account };
        }
        case "CreateMarket": {
            return {
                ...state,
                markets: [
                    ...(state.markets || []),
                    await handleCreateMarket(action, state.selectedAccount),
                ],
            };
        }
        case "CloseMarket": {
            return {
                ...state,
                markets: await handleCloseMarket(
                    action,
                    state.markets || [],
                    state.selectedAccount
                ),
            };
        }
        case "Trade": {
            return {
                ...state,
                markets: await handleTrade(
                    action,
                    state.markets,
                    state.selectedAccount
                ),
            };
        }
        case "RedeemPositions": {
            return {
                ...state,
                markets: await handleRedeemPositions(
                    action,
                    state.markets,
                    state.selectedAccount
                ),
            };
        }
        default: {
            return state;
        }
    }
});
