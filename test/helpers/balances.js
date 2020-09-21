// eslint-disable-next-line no-undef
const WETH9 = artifacts.require("WETH9.sol");

const getWeth9Balance = async (app, address) => {
    const weth9Instance = await WETH9.at(await app.weth9Token());
    return weth9Instance.balanceOf(address);
};

module.exports = {
    getWeth9Balance,
};
