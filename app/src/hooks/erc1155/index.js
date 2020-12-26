import { useAragonApi } from "@aragon/api-react";
import { useEffect, useState } from "react";
import erc1155Abi from "../../abi/conditional-tokens.json";

export const useERC1155Approved = () => {
    const { api, connectedAccount, currentApp } = useAragonApi();

    const [erc1155Address, setERC1155Address] = useState(null);
    const [approved, setApproved] = useState(false);

    useEffect(() => {
        if (!currentApp || !currentApp.appAddress) {
            return;
        }
        api.call("conditionalTokens").subscribe(setERC1155Address, (error) => {
            console.error("error getting conditional tokens address", error);
        });
    }, [api, currentApp]);

    useEffect(() => {
        if (!currentApp || !currentApp.appAddress || !erc1155Address) {
            return;
        }
        const erc1155Instance = api.external(erc1155Address, erc1155Abi);
        const isApproved = async () => {
            setApproved(
                await erc1155Instance
                    .isApprovedForAll(connectedAccount, currentApp.appAddress)
                    .toPromise()
            );
        };
        isApproved();
    }, [api, connectedAccount, currentApp, erc1155Address]);

    return approved;
};
