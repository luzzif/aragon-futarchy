const { fromAscii, toWei, asciiToHex } = require("web3-utils");
const { encodeQuestion } = require("./realitio");

// eslint-disable-next-line no-undef
const ILMSRMarketMaker = artifacts.require("ILMSRMarketMaker.sol");
// eslint-disable-next-line no-undef
const Realitio = artifacts.require("Realitio.sol");

const newMarket = async (
    app,
    user,
    question,
    outcomes,
    endsAt,
    etherCollateral,
    realitioTimeout
) => {
    const realitioQuestion = encodeQuestion(question, outcomes, "futarchy");
    const receipt = await app.createMarket(
        fromAscii(question),
        outcomes.map(fromAscii),
        endsAt,
        realitioQuestion,
        realitioTimeout,
        { from: user, value: toWei(etherCollateral) }
    );
    const createMarketEvent = receipt.logs.find(
        (log) => log.event === "CreateMarket"
    );
    if (!createMarketEvent) {
        throw new Error("no create market event");
    }
    const { conditionId } = createMarketEvent.args;
    const { marketMaker, realitioQuestionId } = await app.marketData(
        conditionId
    );
    const realitioInstance = await Realitio.at(await app.realitio());
    const contentHash = await realitioInstance.getContentHash(
        realitioQuestionId
    );
    // eslint-disable-next-line no-undef
    assert.exists(contentHash);
    return {
        conditionId,
        realitioQuestionId,
        marketMakerInstance: await ILMSRMarketMaker.at(marketMaker),
        contentHash,
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
