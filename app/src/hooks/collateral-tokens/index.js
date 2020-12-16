import { useAragonApi } from "@aragon/api-react";
import { useEffect, useState } from "react";
import { TOKEN_REGISTRY_ADDRESS, TOKEN_LIST_ID } from "../../constants";
import dxTokenRegistryAbi from "../../abi/dx-token-registry.json";

export const useCollateralTokens = () => {
    const { api, network } = useAragonApi();

    const [collateralTokens, setCollateralTokens] = useState([]);

    useEffect(() => {
        if (!network || !network.id) {
            return;
        }
        const getCollateralTokens = async () => {
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
            for (let i = 0; i < tokenAddresses.length; i++) {
                tokens.push({
                    symbol: tokensData.symbols[i],
                    address: tokenAddresses[i],
                });
            }
            setCollateralTokens(tokens);
        };
        getCollateralTokens();
    }, [api, network]);

    return collateralTokens;
};
