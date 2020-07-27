module.exports = {
    getInitParams: async ({ log }, { artifacts, web3 }) => {
        const chainId = await web3.eth.getChainId();
        let conditionalTokensAddress;
        let lsmrMarketMakerFactoryAddress;
        let weth9Address;
        let whitelistAddress;
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
            const Whitelist = artifacts.require("Whitelist.sol");

            const fixed192x64MathInstance = await Fixed192x64Math.new({
                from: appManager,
            });
            const conditionalTokensInstance = await ConditionalTokens.new({
                from: appManager,
            });
            const weth9Instance = await WETH9.new({ from: appManager });
            const whitelistInstance = await Whitelist.new({ from: appManager });

            await LMSRMarketMakerFactory.link(fixed192x64MathInstance);
            const lsmrMarketMakerFactoryInstance = await LMSRMarketMakerFactory.new(
                { from: appManager }
            );
            conditionalTokensAddress = conditionalTokensInstance.address;
            lsmrMarketMakerFactoryAddress =
                lsmrMarketMakerFactoryInstance.address;
            weth9Address = weth9Instance.address;
            whitelistAddress = whitelistInstance.address;
        } else {
            // TODO: set initialization addresses
            conditionalTokensAddress = 0;
            lsmrMarketMakerFactoryAddress = 0;
            weth9Address = 0;
        }
        log(`Conditional tokens address: ${conditionalTokensAddress}`);
        log(
            `LSMR market maker factory address: ${lsmrMarketMakerFactoryAddress}`
        );
        log(`WETH9 address: ${lsmrMarketMakerFactoryAddress}`);
        log(`Whitelist address: ${whitelistAddress}`);
        return [
            conditionalTokensAddress,
            lsmrMarketMakerFactoryAddress,
            weth9Address,
            whitelistAddress,
        ];
    },
};
