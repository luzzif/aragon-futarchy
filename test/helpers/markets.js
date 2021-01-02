const { fromAscii, toWei, asciiToHex } = require("web3-utils");
const { encodeQuestion } = require("./realitio");

// eslint-disable-next-line no-undef
const ILMSRMarketMaker = artifacts.require("ILMSRMarketMaker.sol");
// eslint-disable-next-line no-undef
const Realitio = artifacts.require("Realitio.sol");

const newMarket = async (
    app,
    user,
    collateralTokenInstance,
    collateralAmount,
    question,
    outcomes,
    endsAt
) => {
    const realitioQuestion = encodeQuestion(question, outcomes, "futarchy");
    const weiCollateralAmount = await toWei(collateralAmount);
    await collateralTokenInstance.mint(user, weiCollateralAmount);
    await collateralTokenInstance.approve(app.address, weiCollateralAmount, {
        from: user,
    });
    const receipt = await app.createMarket(
        collateralTokenInstance.address,
        weiCollateralAmount,
        fromAscii(question),
        outcomes.map(fromAscii),
        endsAt,
        realitioQuestion,
        { from: user }
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
    const fee = await marketMakerInstance.calcMarketFee(
        netCost.abs().toString()
    );
    return netCost.add(fee);
};

module.exports = {
    newMarket,
    getPositionId,
    getTradeCostWithFees,
};
