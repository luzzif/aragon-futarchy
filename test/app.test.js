/* eslint-disable no-undef */
const { newDao, newApp } = require("./helpers/dao");
const { setOpenPermission } = require("./helpers/permissions");
const { toWei, asciiToHex } = require("web3-utils");
const { getEventArgument } = require("@aragon/contract-test-helpers/events");
const { assertRevert } = require("@aragon/contract-test-helpers/assertThrow");
const {
    newMarket,
    getPositionId,
    getTradeCostWithFees,
} = require("./helpers/markets");
const { getWeth9Balance } = require("./helpers/balances.js");

const FutarchyApp = artifacts.require("FutarchyApp.sol");

// eslint-disable-next-line no-undef
contract("FutarchyApp", ([appManager, user]) => {
    let appBase, app, conditionalTokensInstance, collateralTokenAddress;

    before("deploy base app", async () => {
        appBase = await FutarchyApp.new();
    });

    beforeEach("deploy dao and app", async () => {
        const { dao, acl } = await newDao(appManager);

        const proxyAddress = await newApp(
            dao,
            "futarchy",
            appBase.address,
            appManager
        );
        app = await FutarchyApp.at(proxyAddress);

        await setOpenPermission(
            acl,
            app.address,
            await app.CREATE_MARKET_ROLE(),
            appManager
        );
        await setOpenPermission(
            acl,
            app.address,
            await app.TRADE_ROLE(),
            appManager
        );
        await setOpenPermission(
            acl,
            app.address,
            await app.CLOSE_MARKET_ROLE(),
            appManager
        );

        const ConditionalTokens = artifacts.require("ConditionalTokens.sol");
        const Fixed192x64Math = artifacts.require("Fixed192x64Math.sol");
        const LMSRMarketMakerFactory = artifacts.require(
            "LMSRMarketMakerFactory.sol"
        );
        const WETH9 = artifacts.require("WETH9.sol");

        const fixed192x64MathInstance = await Fixed192x64Math.new({
            from: appManager,
        });
        conditionalTokensInstance = await ConditionalTokens.new({
            from: appManager,
        });
        const weth9Instance = await WETH9.new({ from: appManager });
        collateralTokenAddress = weth9Instance.address;

        await LMSRMarketMakerFactory.link(fixed192x64MathInstance);
        const lsmrMarketMakerFactoryInstance = await LMSRMarketMakerFactory.new(
            { from: appManager }
        );

        await app.initialize(
            conditionalTokensInstance.address,
            lsmrMarketMakerFactoryInstance.address,
            weth9Instance.address
        );
    });

    it("should guarantee a market creation to anyone", async () => {
        await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
    });

    it("should let a user perform a buy", async () => {
        const { conditionId, marketMakerInstance } = await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
        const wantedShares = toWei("0.123");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        await app.buy(conditionId, outcomeTokensAmount, totalCost, {
            from: user,
            value: totalCost,
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenAddress,
            conditionId
        );
        const rawOutcomeTokenAmount = await conditionalTokensInstance.balanceOf(
            user,
            positionId
        );
        assert.equal(rawOutcomeTokenAmount.toString(), wantedShares);
    });

    it("should let a user perform a sell", async () => {
        const { conditionId, marketMakerInstance } = await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
        const wantedShares = toWei("1");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        // buying the tokens that will be sold later
        await app.buy(conditionId, outcomeTokensAmount, totalCost.toString(), {
            from: user,
            value: totalCost.toString(),
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenAddress,
            conditionId
        );
        const preSellRawOutcomeTokenAmount = await conditionalTokensInstance.balanceOf(
            user,
            positionId
        );
        assert.equal(preSellRawOutcomeTokenAmount.toString(), wantedShares);
        await conditionalTokensInstance.setApprovalForAll(app.address, true, {
            from: user,
        });
        const sellReceipt = await app.sell(conditionId, outcomeTokensAmount, {
            from: user,
        });
        const postSellRawOutcomeTokenAmount = await conditionalTokensInstance.balanceOf(
            user,
            positionId
        );
        assert.equal(postSellRawOutcomeTokenAmount.toString(), "0");
        const weth9Balance = await getWeth9Balance(app, user);
        assert.equal(
            weth9Balance.toString(),
            getEventArgument(sellReceipt, "Trade", "netCollateralCost")
                .abs()
                .toString()
        );
    });

    it("shouldn't let a user sell more than what they have", async () => {
        const { conditionId, marketMakerInstance } = await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
        const wantedShares = toWei("1");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        // buying the tokens that will be sold later
        await app.buy(conditionId, outcomeTokensAmount, totalCost.toString(), {
            from: user,
            value: totalCost.toString(),
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenAddress,
            conditionId
        );
        assert.equal(
            wantedShares,
            await conditionalTokensInstance.balanceOf(user, positionId)
        );
        assertRevert(
            app.sell(conditionId, [toWei("2"), "0"], { from: user }),
            "INSUFFICIENT_BALANCE"
        );
    });

    it("should let a user close a market", async () => {
        let { conditionId } = await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
        const { questionId } = await app.marketData(conditionId, {
            from: user,
        });
        await app.closeMarket(["1", "0"], conditionId, questionId, {
            from: user,
        });
    });

    it("should let a user redeem their positions", async () => {
        let { conditionId } = await newMarket(
            app,
            user,
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000,
            "1"
        );
        const wantedShares = toWei("1");
        const outcomeTokens = [wantedShares, "0"];
        const netCost = await app.getNetCost(outcomeTokens, conditionId);
        const fee = await app.getMarketFee(conditionId, netCost.toString());
        const totalCost = netCost.add(fee);
        await app.buy(conditionId, [wantedShares, "0"], totalCost.toString(), {
            from: user,
            value: totalCost.toString(),
        });
        const collateralTokenAddress = await app.weth9Token();
        const collectionId = await app.getCollectionId(
            asciiToHex(""),
            conditionId,
            1
        );
        const positionId = await app.getPositionId(
            collateralTokenAddress,
            collectionId
        );
        const onchainBalance = (
            await conditionalTokensInstance.balanceOf(positionId, {
                from: user,
            })
        ).toString();
        assert.equal(onchainBalance, wantedShares);
        const { questionId } = await app.marketData(conditionId, {
            from: user,
        });
        await app.closeMarket(["1", "0"], conditionId, questionId, {
            from: user,
        });
        await app.redeemPositions(["1", "2"], conditionId, {
            from: user,
        });
    });
});
