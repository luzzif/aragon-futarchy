import "core-js/stable";
import "regenerator-runtime/runtime";
import Aragon, { events } from "@aragon/api";
import { asciiToHex, hexToAscii } from "web3-utils";
import BigNumber from "bignumber.js";
import conditionalTokensAbi from "./abi/conditional-tokens.json";
import lmsrMarketMakerAbi from "./abi/lmsr-market-maker.json";

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
    try {
        const outcomes = [];
        const collateralTokenAddress = await app.call("weth9Token").toPromise();
        const conditionalTokensInstance = app.external(
            await app.call("conditionalTokens").toPromise(),
            conditionalTokensAbi
        );
        const marketData = await app
            .call("marketData", conditionId)
            .toPromise();
        const marketMakerInstance = app.external(
            marketData.marketMaker,
            lmsrMarketMakerAbi
        );
        for (let i = 0; i < outcomeLabels.length; i++) {
            let balance = "0";
            let positionId = "";
            if (selectedAccount) {
                const collectionId = await conditionalTokensInstance
                    .getCollectionId(asciiToHex(""), conditionId, i + 1)
                    .toPromise();
                positionId = await conditionalTokensInstance
                    .getPositionId(collateralTokenAddress, collectionId)
                    .toPromise();
                balance = await conditionalTokensInstance
                    .balanceOf(selectedAccount, positionId)
                    .toPromise();
            }
            let price;
            if (marginalPricesAtClosure && marginalPricesAtClosure[i]) {
                price = marginalPricesAtClosure[i];
            } else {
                price = await marketMakerInstance
                    .calcMarginalPrice(i)
                    .toPromise();
            }
            outcomes.push({
                label: outcomeLabels[i],
                positionId,
                balance,
                price: new BigNumber(price)
                    .dividedBy(new BigNumber("2").pow("64"))
                    .toString(),
                correct: payouts && payouts[i] === "1",
            });
        }
        return outcomes;
    } catch (error) {
        console.error("error getting updated outcomes information", error);
    }
};

const handleCreateMarket = async (event, selectedAccount) => {
    try {
        const { returnValues } = event;
        const {
            creator,
            conditionId,
            outcomes: outcomeLabels,
            timestamp,
        } = returnValues;
        const {
            endsAt,
            questionId,
            realitioQuestionId,
            question,
        } = await app.call("marketData", conditionId).toPromise();
        return {
            conditionId,
            creator,
            question: hexToAscii(removeTrailingZeroes(question)),
            outcomes: await getUpdatedOutcomesInformation(
                selectedAccount,
                conditionId,
                outcomeLabels.map(removeTrailingZeroes).map(hexToAscii)
            ),
            timestamp: parseInt(timestamp),
            endsAt: parseInt(endsAt),
            open: true,
            questionId,
            realitioQuestionId,
        };
    } catch (error) {
        console.error("error handling create market event", error);
    }
};

const handleCloseMarket = async (event, markets, selectedAccount) => {
    try {
        const { returnValues } = event;
        const { conditionId, payouts, marginalPricesAtClosure } = returnValues;
        const marketIndex = markets.findIndex(
            (market) => market.conditionId === conditionId
        );
        if (marketIndex >= 0) {
            markets[marketIndex].open = false;
            markets[marketIndex].payouts = payouts;
            markets[
                marketIndex
            ].marginalPricesAtClosure = marginalPricesAtClosure;
            markets[marketIndex].outcomes = await getUpdatedOutcomesInformation(
                selectedAccount,
                conditionId,
                markets[marketIndex].outcomes.map((outcome) => outcome.label),
                payouts,
                marginalPricesAtClosure
            );
        }
        return [...markets];
    } catch (error) {
        console.error("error handling close market event", error);
    }
};

const handleTrade = async (event, markets, selectedAccount) => {
    try {
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
    } catch (error) {
        console.error("error handling trade event", error);
    }
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
            return {
                ...state,
                selectedAccount: action.returnValues.account,
            };
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
        default: {
            return state;
        }
    }
});
