import { useAragonApi } from "@aragon/api-react";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Market as MarketComponent } from "../../components/market";

export const Market = () => {
    const { conditionId } = useParams();
    const history = useHistory();
    const { appState, api } = useAragonApi();
    const { markets } = appState;

    const [selectedMarket, setSelectedMarket] = useState(null);

    useEffect(() => {
        if (conditionId && markets && markets.length > 0) {
            const selectedMarket = markets.find(
                (market) => market.conditionId === conditionId
            );
            setSelectedMarket(selectedMarket || {});
        }
    }, [conditionId, markets]);

    const handleClose = useCallback(() => {
        api.closeMarket(conditionId).subscribe(() => {}, console.error);
    }, [api, conditionId]);

    const handleBack = useCallback(() => {
        history.goBack();
    }, [history]);

    return selectedMarket ? (
        <MarketComponent
            {...selectedMarket}
            onBack={handleBack}
            onClose={handleClose}
        />
    ) : null;
};
