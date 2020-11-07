require("dotenv").config();
const Web3 = require("web3");
const fs = require("fs");

const SUPPORTED_NETWORKS = ["rinkeby"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const { INFURA_PROJECT_ID } = process.env;
if (!INFURA_PROJECT_ID) {
    console.error("please set an Infura project id in the .env file");
    return;
}

const [, , network, address] = process.argv;

if (!network) {
    console.error("no network provided");
    return;
}
if (SUPPORTED_NETWORKS.indexOf(network) < 0) {
    console.error(
        `invalid network provided, valid values are: ${SUPPORTED_NETWORKS.join(
            ", "
        )}`
    );
}

const web3Instance = new Web3(
    `https://${network}.infura.io/v3/${INFURA_PROJECT_ID}`
);

if (!address) {
    console.error("no instance address provided");
    return;
}
if (!web3Instance.utils.isAddress(address)) {
    console.error("invalid address provided");
    return;
}

const rawAppArtifact = fs.readFileSync(
    `${__dirname}/../artifacts/FutarchyApp.json`
);
const { abi: appAbi } = JSON.parse(rawAppArtifact);
const contract = new web3Instance.eth.Contract(appAbi, address);

Promise.all([
    contract.methods.getInitializationBlock().call(),
    contract.methods.hasInitialized().call(),
    contract.methods.weth9Token().call(),
    contract.methods.lmsrMarketMakerFactory().call(),
    contract.methods.conditionalTokens().call(),
]).then(
    ([
        initializationBlock,
        hasInitialized,
        weth9Address,
        lmsrMarketMakerFactoryAddress,
        conditionalTokensAddress,
    ]) => {
        console.log("App's initialization block: ", initializationBlock);
        console.log(
            `The app has ${!hasInitialized ? "not" : ""} been initialized`
        );
        console.log(
            "WETH9 token address: ",
            weth9Address === ZERO_ADDRESS ? "not set" : weth9Address
        );
        console.log(
            "LMSR market maker factory address: ",
            lmsrMarketMakerFactoryAddress === ZERO_ADDRESS
                ? "not set"
                : lmsrMarketMakerFactoryAddress
        );
        console.log(
            "Conditional tokens address: ",
            conditionalTokensAddress === ZERO_ADDRESS
                ? "not set"
                : conditionalTokensAddress
        );
    }
);
