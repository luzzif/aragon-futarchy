import React, { useCallback, useState } from "react";
import Main from "@aragon/ui/dist/Main";
import Header from "@aragon/ui/dist/Header";
import Button from "@aragon/ui/dist/Button";
import SyncIndicator from "@aragon/ui/dist/SyncIndicator";
import { useAragonApi } from "@aragon/api-react";
import { NewMarketSidePanel } from "../../components/new-market-side-panel";
import { asciiToHex, toWei } from "web3-utils";
import { MarketsList } from "../../components/markets-list";
import { Market } from "../../components/market";
import { NoMarkets } from "../../components/no-markets";

export const App = () => {
    const { appState, api, connectedAccount } = useAragonApi();
    const { syncing, markets } = appState;
    const [newMarketSidePanelOpen, setNewMarketSidePanelOpen] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState(null);

    const handleNewMarketOpen = useCallback(() => {
        setNewMarketSidePanelOpen(true);
    }, []);

    const handleNewMarketClose = useCallback(() => {
        setNewMarketSidePanelOpen(false);
    }, []);

    const handleMarketCreate = useCallback(
        (question, outcomes, funding) => {
            const rawQuestionId = Date.now().toString();
            // shortening the question id to a maximum of 32 chars, just in case
            const shortenedQuestionId = rawQuestionId.substring(
                rawQuestionId.length - 33
            );
            api.createMarket(
                connectedAccount,
                asciiToHex(shortenedQuestionId),
                outcomes.length,
                asciiToHex(question),
                outcomes.map(asciiToHex),
                {
                    from: connectedAccount,
                    value: toWei(funding.toString(), "ether"),
                }
            ).subscribe(() => {}, console.error);
        },
        [api, connectedAccount]
    );

    const handleMarketClick = useCallback(
        (conditionId) => {
            setSelectedMarket(
                markets.find((market) => market.conditionId === conditionId)
            );
        },
        [markets]
    );

    const handleMarketBack = useCallback(() => {
        setSelectedMarket(null);
    }, []);

    return (
        <Main>
            {syncing && <SyncIndicator />}
            <Header
                primary="Prediction markets"
                secondary={
                    <Button
                        mode="strong"
                        label="Create a market"
                        onClick={handleNewMarketOpen}
                    />
                }
            />
            <NewMarketSidePanel
                open={newMarketSidePanelOpen}
                onClose={handleNewMarketClose}
                onCreate={handleMarketCreate}
            />
            {(!markets || markets.length === 0) && <NoMarkets />}
            {markets && markets.length > 0 && !selectedMarket && (
                <MarketsList
                    markets={markets}
                    onMarketClick={handleMarketClick}
                />
            )}
            {selectedMarket && (
                <Market {...selectedMarket} onBack={handleMarketBack} />
            )}
        </Main>
    );
};
