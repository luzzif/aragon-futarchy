require("dotenv").config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    networks: {
        rinkeby: {
            provider: () =>
                new HDWalletProvider(
                    process.env.PRIVATE_KEY,
                    `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
                ),
            network_id: 4,
        },
    },
};
