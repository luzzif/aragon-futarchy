/* eslint-disable no-undef */
const { expect } = require("chai");
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
const BN = require("bn.js");

const FutarchyApp = artifacts.require("FutarchyApp.sol");

// eslint-disable-next-line no-undef
contract("FutarchyApp", ([appManager, user]) => {
    const arbitrationPrice = toWei("0.1");
    let appBase,
        app,
        conditionalTokensInstance,
        collateralTokenInstance,
        realitioInstance,
        realitioArbitratorProxyInstance;

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
        const ERC20PresetMinterPauser = await artifacts.require(
            "ERC20PresetMinterPauser.sol"
        );
        const Realitio = artifacts.require("Realitio.sol");
        const CentralizedArbitrator = artifacts.require(
            "CentralizedArbitrator.sol"
        );
        const RealitioArbitratorProxy = artifacts.require(
            "RealitioArbitratorProxy.sol"
        );

        const fixed192x64MathInstance = await Fixed192x64Math.new({
            from: appManager,
        });
        conditionalTokensInstance = await ConditionalTokens.new({
            from: appManager,
        });
        collateralTokenInstance = await ERC20PresetMinterPauser.new(
            "Mocked 1",
            "MCK1"
        );
        realitioInstance = await Realitio.new({ from: appManager });
        const arbitratorInstance = await CentralizedArbitrator.new(
            arbitrationPrice,
            { from: appManager }
        );
        realitioArbitratorProxyInstance = await RealitioArbitratorProxy.new(
            arbitratorInstance.address,
            asciiToHex(""),
            realitioInstance.address,
            { from: appManager }
        );

        await LMSRMarketMakerFactory.link(fixed192x64MathInstance);
        const lsmrMarketMakerFactoryInstance = await LMSRMarketMakerFactory.new(
            { from: appManager }
        );

        await app.initialize(
            conditionalTokensInstance.address,
            lsmrMarketMakerFactoryInstance.address,
            realitioInstance.address,
            3, // 3 seconds realitio timeout
            realitioArbitratorProxyInstance.address
        );
    });

    it("should guarantee a market creation to anyone", async () => {
        await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000
        );
    });

    it("should let a user perform a buy", async () => {
        const { conditionId, marketMakerInstance } = await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000
        );
        const wantedShares = toWei("0.123");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        await collateralTokenInstance.mint(user, totalCost.toString());
        await collateralTokenInstance.approve(
            app.address,
            totalCost.toString(),
            { from: user }
        );
        await app.buy(conditionId, outcomeTokensAmount, totalCost, {
            from: user,
            value: totalCost,
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenInstance.address,
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
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000
        );
        const wantedShares = toWei("1");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        // buying the tokens that will be sold later
        await collateralTokenInstance.mint(user, totalCost.toString());
        await collateralTokenInstance.approve(
            app.address,
            totalCost.toString(),
            { from: user }
        );
        await app.buy(conditionId, outcomeTokensAmount, totalCost.toString(), {
            from: user,
            value: totalCost.toString(),
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenInstance.address,
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
        const totalCollateralBack = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount.map((amount) =>
                amount === "0" ? "0" : `-${amount}`
            )
        );
        const sellReceipt = await app.sell(
            conditionId,
            outcomeTokensAmount,
            totalCollateralBack.abs().toString(),
            { from: user }
        );
        const postSellRawOutcomeTokenAmount = await conditionalTokensInstance.balanceOf(
            user,
            positionId
        );
        assert.equal(postSellRawOutcomeTokenAmount.toString(), "0");
        const collateralBalance = await collateralTokenInstance.balanceOf(user);
        assert.isTrue(collateralBalance.gt(new BN(0)));
        assert.equal(
            collateralBalance.toString(),
            getEventArgument(sellReceipt, "Trade", "netCollateralCost")
                .abs()
                .toString()
        );
    });

    it("shouldn't let a user sell more than what they have", async () => {
        const { conditionId, marketMakerInstance } = await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000) + 1000
        );
        const wantedShares = toWei("1");
        const outcomeTokensAmount = [wantedShares, "0"];
        const totalCost = await getTradeCostWithFees(
            marketMakerInstance,
            outcomeTokensAmount
        );
        // buying the tokens that will be sold later
        await collateralTokenInstance.mint(user, totalCost.toString());
        await collateralTokenInstance.approve(
            app.address,
            totalCost.toString(),
            { from: user }
        );
        await app.buy(conditionId, outcomeTokensAmount, totalCost.toString(), {
            from: user,
            value: totalCost.toString(),
        });
        const positionId = await getPositionId(
            conditionalTokensInstance,
            collateralTokenInstance.address,
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

    it("should let a user close a market", async function () {
        let { conditionId, realitioQuestionId } = await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000)
        );
        await realitioInstance.submitAnswer(realitioQuestionId, "0x0", 0, {
            value: toWei("1"),
        });
        await new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
        const receipt = await app.closeMarket(conditionId, { from: user });
        const closeMarketEvent = receipt.logs.find(
            (log) => log.event === "CloseMarket"
        );
        const { args } = closeMarketEvent;
        expect(args.conditionId).to.be.equal(conditionId);
        expect(args.payouts).to.have.length(2);
        expect(args.payouts[0].toString()).to.be.equal("1");
        expect(args.payouts[1].toString()).to.be.equal("0");
    });

    it("should let a user redeem positions on a market", async function () {
        const outcomes = ["test-outcome-1", "test-outcome-2"];
        let { conditionId, realitioQuestionId } = await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            outcomes,
            parseInt(Date.now() / 1000)
        );
        await realitioInstance.submitAnswer(realitioQuestionId, "0x0", 0, {
            value: toWei("1"),
        });
        await new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
        let receipt = await app.closeMarket(conditionId, { from: user });
        const closeMarketEvent = receipt.logs.find(
            (log) => log.event === "CloseMarket"
        );
        const { args } = closeMarketEvent;
        expect(args.conditionId).to.be.equal(conditionId);
        expect(args.payouts).to.have.length(2);
        expect(args.payouts[0].toString()).to.be.equal("1");
        expect(args.payouts[1].toString()).to.be.equal("0");
        receipt = await conditionalTokensInstance.redeemPositions(
            collateralTokenInstance.address,
            asciiToHex(""),
            conditionId,
            outcomes.map((_, index) => 1 << index),
            { from: user }
        );
    });

    it("should handle a reality.eth answer that marks the question as invalid", async function () {
        let { conditionId, realitioQuestionId } = await newMarket(
            app,
            user,
            collateralTokenInstance,
            "1",
            "test-question",
            ["test-outcome-1", "test-outcome-2"],
            parseInt(Date.now() / 1000)
        );
        // marking the question as invalid
        await realitioInstance.submitAnswer(
            realitioQuestionId,
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            0,
            { value: toWei("1") }
        );
        await new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
        const receipt = await app.closeMarket(conditionId, { from: user });
        const closeMarketEvent = receipt.logs.find(
            (log) => log.event === "CloseMarket"
        );
        const { args } = closeMarketEvent;
        expect(args.conditionId).to.be.equal(conditionId);
        expect(args.payouts).to.have.length(2);
        expect(args.payouts[0].toString()).to.be.equal("1");
        expect(args.payouts[1].toString()).to.be.equal("1");
    });
});
