const { assertEvent } = require("@aragon/contract-test-helpers/assertEvent");
const { newDao, newApp } = require("./helpers/dao");
const { setOpenPermission } = require("./helpers/permissions");
const { fromAscii, padRight } = require("web3-utils");

// eslint-disable-next-line no-undef
const PredictionMarketsApp = artifacts.require("PredictionMarketsApp.sol");
// eslint-disable-next-line no-undef
const AppDependencies = artifacts.require("AppDependencies.sol");

// eslint-disable-next-line no-undef
contract("PredictionMarketsApp", ([appManager, user]) => {
    let dependencies, appBase, app;

    before("deploy base app", async () => {
        dependencies = await AppDependencies.new();
        appBase = await PredictionMarketsApp.new(dependencies.address);
    });

    beforeEach("deploy dao and app", async () => {
        const { dao, acl } = await newDao(appManager);

        const proxyAddress = await newApp(
            dao,
            "prediction-markets",
            appBase.address,
            appManager
        );
        app = await PredictionMarketsApp.at(proxyAddress);

        await setOpenPermission(
            acl,
            app.address,
            await app.CREATE_MARKET_ROLE(),
            appManager
        );

        await app.initialize(dependencies.address);
    });

    it("should guarantee a market creation to anyone", async () => {
        const rawQuestionId = Date.now().toString();
        const receipt = await app.createMarket(
            user,
            fromAscii(rawQuestionId),
            2,
            fromAscii("test-question"),
            [fromAscii("test-outcome-1"), fromAscii("test-outcome-2")],
            { from: user }
        );
        assertEvent(receipt, "Test", {
            creator: user,
            questionId: padRight(fromAscii(rawQuestionId), 64),
        });
    });
});
