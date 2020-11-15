const { toWei, asciiToHex } = require("web3-utils");

module.exports = {
    getInitParams: async ({ log }, { artifacts, web3 }) => {
        const chainId = await web3.eth.getChainId();
        const arbitrationPrice = toWei("0.1");
        let conditionalTokensAddress;
        let lsmrMarketMakerFactoryAddress;
        let weth9Address;
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
            const WETH9 = artifacts.require("WETH9.sol");
            const Realitio = artifacts.require("Realitio");
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
            const weth9Instance = await WETH9.new({ from: appManager });
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
            weth9Address = weth9Instance.address;
            realitioAddress = realitioInstance.address;
            realitioArbitratorProxyAddress =
                realitioArbitratorProxyInstance.address;
        } else {
            // TODO: set initialization addresses
            conditionalTokensAddress = 0;
            lsmrMarketMakerFactoryAddress = 0;
            weth9Address = 0;
            realitioAddress = 0;
            realitioArbitratorProxyAddress = 0;
        }
        log(`Conditional tokens address: ${conditionalTokensAddress}`);
        log(
            `LSMR market maker factory address: ${lsmrMarketMakerFactoryAddress}`
        );
        log(`WETH9 address: ${weth9Address}`);
        log(`Realitio address: ${realitioAddress}`);
        log(
            `Realitio arbitration proxy address: ${realitioArbitratorProxyAddress}`
        );
        return [
            conditionalTokensAddress,
            lsmrMarketMakerFactoryAddress,
            weth9Address,
            realitioAddress,
            realitioArbitratorProxyAddress,
        ];
    },
};
