const { toWei, asciiToHex } = require("web3-utils");

module.exports = {
    getInitParams: async ({ log }, { artifacts, web3 }) => {
        const chainId = await web3.eth.getChainId();
        const arbitrationPrice = toWei("0.1");
        let conditionalTokensAddress;
        let lsmrMarketMakerFactoryAddress;
        let realitioAddress;
        let realitioArbitratorProxyAddress;
        // Check if running on local network or not
        if (chainId == 1337) {
            log("deploying contracts in local network");
            const [appManager] = await web3.eth.getAccounts();
            const ConditionalTokens = artifacts.require(
                "ConditionalTokens.sol"
            );
            const Fixed192x64Math = artifacts.require("Fixed192x64Math.sol");
            const LMSRMarketMakerFactory = artifacts.require(
                "LMSRMarketMakerFactory.sol"
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
            const conditionalTokensInstance = await ConditionalTokens.new({
                from: appManager,
            });
            const realitioInstance = await Realitio.new({ from: appManager });
            const arbitratorInstance = await CentralizedArbitrator.new(
                arbitrationPrice,
                { from: appManager }
            );
            const realitioArbitratorProxyInstance = await RealitioArbitratorProxy.new(
                arbitratorInstance.address,
                asciiToHex(""),
                realitioInstance.address,
                { from: appManager }
            );

            await LMSRMarketMakerFactory.link(fixed192x64MathInstance);
            const lsmrMarketMakerFactoryInstance = await LMSRMarketMakerFactory.new(
                { from: appManager }
            );
            conditionalTokensAddress = conditionalTokensInstance.address;
            lsmrMarketMakerFactoryAddress =
                lsmrMarketMakerFactoryInstance.address;
            realitioAddress = realitioInstance.address;
            realitioArbitratorProxyAddress =
                realitioArbitratorProxyInstance.address;

            const DXTokenRegistry = artifacts.require("DXTokenRegistry.sol");
            const dxTokenRegistryInstance = await DXTokenRegistry.new({
                from: appManager,
            });
            log(`DXToken address: ${dxTokenRegistryInstance.address}`);
            await dxTokenRegistryInstance.addList("mocked list", {
                from: appManager,
            });
            const ERC20PresetMinterPauser = await artifacts.require(
                "ERC20PresetMinterPauser.sol"
            );
            const mockedToken1 = await ERC20PresetMinterPauser.new(
                "Mocked 1",
                "MCK1"
            );
            const mockedToken2 = await ERC20PresetMinterPauser.new(
                "Mocked 2",
                "MCK2"
            );
            await dxTokenRegistryInstance.addTokens(
                1,
                [mockedToken1.address, mockedToken2.address],
                { from: appManager }
            );
            log(
                `Added 2 mocked tokens at addresses ${mockedToken1.address} and ${mockedToken2.address}`
            );
            await mockedToken1.mint(appManager, toWei("100"));
            await mockedToken2.mint(appManager, toWei("100"));
            log("Mocked tokens minted");
        } else {
            conditionalTokensAddress = 0;
            lsmrMarketMakerFactoryAddress = 0;
            realitioAddress = 0;
            realitioArbitratorProxyAddress = 0;
        }
        log(`Conditional tokens address: ${conditionalTokensAddress}`);
        log(
            `LSMR market maker factory address: ${lsmrMarketMakerFactoryAddress}`
        );
        log(`Realitio address: ${realitioAddress}`);
        log(`Realitio timeout: 60`);
        log(
            `Realitio arbitration proxy address: ${realitioArbitratorProxyAddress}`
        );
        return [
            conditionalTokensAddress,
            lsmrMarketMakerFactoryAddress,
            realitioAddress,
            60, // realitio seconds timeout
            realitioArbitratorProxyAddress,
        ];
    },
};
