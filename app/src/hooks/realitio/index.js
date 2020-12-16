import { useAragonApi } from "@aragon/api-react";
import { useEffect, useState } from "react";

export const useRealitioTimeout = () => {
    const { api, network } = useAragonApi();

    const [timeout, setTimeout] = useState(0);

    useEffect(() => {
        const setTimeoutAsync = async () => {
            setTimeout(await api.call("realitioTimeout").toPromise());
        };
        setTimeoutAsync();
    }, [api, network]);

    return timeout;
};
