module.exports = {
    getInitParams: async (params, { artifacts, web3 }) => {
        const AppDependencies = artifacts.require("AppDependencies");
        const [appManager] = await web3.eth.getAccounts();
        const deployedContract = await AppDependencies.new({
            from: appManager,
        });
        return [deployedContract.address];
    },
};
