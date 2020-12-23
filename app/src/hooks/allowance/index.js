import { useAragonApi } from "@aragon/api-react";
import { useEffect, useState } from "react";
import conditionalTokensAbi from "../../abi/conditional-tokens.json";

export const useApproved = () => {
    const { api, connectedAccount, currentApp } = useAragonApi();

    const [approved, setApproved] = useState(false);

    useEffect(() => {
        const fetchAndSetApproval = async () => {
            const conditionalTokensInstance = api.external(
                await api.call("conditionalTokens").toPromise(),
                conditionalTokensAbi
            );
            setApproved(
                await conditionalTokensInstance
                    .isApprovedForAll(connectedAccount, currentApp.appAddress)
                    .toPromise()
            );
        };
        fetchAndSetApproval();
    }, [api, connectedAccount, currentApp]);

    return approved;
};
