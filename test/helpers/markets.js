const { fromAscii, toWei, asciiToHex } = require("web3-utils");

// eslint-disable-next-line no-undef
const ILMSRMarketMaker = artifacts.require("ILMSRMarketMaker.sol");

const newMarket = async (
    app,
    user,
    question,
    outcomes,
    endsAt,
    etherCollateral
) => {
    const rawQuestionId = Date.now().toString();
    const receipt = await app.createMarket(
        user,
        fromAscii(rawQuestionId),
        2,
        fromAscii(question),
        outcomes.map(fromAscii),
        endsAt,
        { from: user, value: toWei(etherCollateral) }
    );
    const createMarketEvent = receipt.logs.find(
        (log) => log.event === "CreateMarket"
    );
    if (!createMarketEvent) {
        throw new Error("no create market event");
    }
    const { conditionId } = createMarketEvent.args;
    const { marketMaker } = await app.marketData(conditionId);
    return {
        conditionId,
        marketMakerInstance: await ILMSRMarketMaker.at(marketMaker),
    };
};

const getPositionId = async (
    conditionalTokensInstance,
    collateralTokenAddress,
    conditionId
) => {
    const collectionId = await conditionalTokensInstance.getCollectionId(
        asciiToHex(""),
        conditionId,
        1
    );
    return conditionalTokensInstance.getPositionId(
        collateralTokenAddress,
        collectionId
    );
};

const getTradeCostWithFees = async (
    marketMakerInstance,
    outcomeTokenAmounts
) => {
    const netCost = await marketMakerInstance.calcNetCost(outcomeTokenAmounts);
    const fee = await marketMakerInstance.calcMarketFee(netCost.toString());
    return netCost.add(fee);
};

module.exports = {
    newMarket,
    getPositionId,
    getTradeCostWithFees,
};
