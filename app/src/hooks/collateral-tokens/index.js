import { useAragonApi } from "@aragon/api-react";
import { useEffect, useState } from "react";
import { TOKEN_REGISTRY_ADDRESS, TOKEN_LIST_ID } from "../../constants";
import dxTokenRegistryAbi from "../../abi/dx-token-registry.json";
import erc20Abi from "../../abi/erc20.json";

export const useCollateralTokens = () => {
    const { api, network } = useAragonApi();

    const [collateralTokens, setCollateralTokens] = useState([]);

    useEffect(() => {
        if (!network || !network.id) {
            return;
        }
        const getCollateralTokens = async () => {
            if (network.id === 1337) {
                const dxTokenRegistryInstance = api.external(
                    TOKEN_REGISTRY_ADDRESS[network.id],
                    dxTokenRegistryAbi
                );
                const tokenAddresses = await dxTokenRegistryInstance
                    .getTokens(TOKEN_LIST_ID[network.id])
                    .toPromise();
                const tokensData = await dxTokenRegistryInstance
                    .getTokensData(tokenAddresses)
                    .toPromise();
                const tokens = [];
                for (let i = 0; i < tokensData.symbols.length; i++) {
                    tokens.push({
                        symbol: tokensData.symbols[i],
                        address: tokenAddresses[i],
                    });
                }
                setCollateralTokens(tokens);
            } else {
                // using Uniswap's default token list
                const response = await fetch(
                    "https://gateway.ipfs.io/ipns/tokens.uniswap.org"
                );
                if (response.ok) {
                    const json = await response.json();
                    setCollateralTokens(
                        json.tokens.filter(
                            (token) => token.chainId === network.id
                        )
                    );
                }
            }
        };
        getCollateralTokens();
    }, [api, network]);

    return collateralTokens;
};

export const useTokenSymbol = (tokenAddress) => {
    const { api } = useAragonApi();

    const [symbol, setSymbol] = useState([]);

    useEffect(() => {
        if (!tokenAddress) {
            return;
        }
        const getTokenSymbol = async () => {
            const tokenInstance = api.external(tokenAddress, erc20Abi);
            setSymbol(await tokenInstance.symbol().toPromise());
        };
        getTokenSymbol();
    }, [api, tokenAddress]);

    return symbol;
};
