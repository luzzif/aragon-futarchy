import { useAragonApi } from "@aragon/api-react";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import { toWei } from "web3-utils";
import { Market as MarketComponent } from "../../components/market";

export const Market = () => {
    const { conditionId } = useParams();
    const history = useHistory();
    const { appState, api, connectedAccount } = useAragonApi();
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

    const handleClose = useCallback(
        (conditionId, questionId, payouts) => {
            api.closeMarket(
                payouts,
                conditionId,
                questionId
            ).subscribe(() => {}, console.error);
        },
        [api]
    );

    const handleBack = useCallback(() => {
        history.goBack();
    }, [history]);

    const handleTrade = useCallback(
        (conditionId, outcomeTokensAmount, cost, selling) => {
            if (selling) {
                api.sell(
                    conditionId,
                    outcomeTokensAmount.map((amount) =>
                        toWei(amount.toString(), "ether")
                    ),
                    "0"
                ).subscribe(() => {}, console.error);
            } else {
                api.buy(
                    conditionId,
                    outcomeTokensAmount.map((amount) =>
                        toWei(amount.toString(), "ether")
                    ),
                    toWei(cost.toString(), "ether"),
                    { value: toWei(cost.toString(), "ether") }
                ).subscribe(() => {}, console.error);
            }
        },
        [api]
    );

    return selectedMarket ? (
        <MarketComponent
            {...selectedMarket}
            onBack={handleBack}
            connectedAccount={connectedAccount}
            onTrade={handleTrade}
            onClose={handleClose}
        />
    ) : null;
};
