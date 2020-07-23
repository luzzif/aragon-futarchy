import React, { useCallback, useState } from "react";
import Main from "@aragon/ui/dist/Main";
import Header from "@aragon/ui/dist/Header";
import Button from "@aragon/ui/dist/Button";
import SyncIndicator from "@aragon/ui/dist/SyncIndicator";
import EmptyStateCard from "@aragon/ui/dist/EmptyStateCard";
import { useAragonApi } from "@aragon/api-react";
import { NewMarketSidePanel } from "../../components/new-market-side-panel";
import { asciiToHex } from "web3-utils";
import { Box, Flex } from "reflexbox";

export const App = () => {
    const { appState, api, connectedAccount } = useAragonApi();
    const { syncing, markets } = appState;
    const [newMarketSidePanelOpen, setNewMarketSidePanelOpen] = useState(false);

    const handleNewMarketOpen = useCallback(() => {
        setNewMarketSidePanelOpen(true);
    }, []);

    const handleNewMarketClose = useCallback(() => {
        setNewMarketSidePanelOpen(false);
    }, []);

    if (api) {
        api.pastEvents().subscribe(console.log, console.log);
    }

    const handleMarketCreate = useCallback(
        (question, outcomes) => {
            const rawQuestionId = Date.now().toString();
            // shortening the question id to a maximum of 32 chars, just in case
            const shortenedQuestionId = rawQuestionId.substring(
                rawQuestionId.length - 33
            );
            api.createMarket(
                asciiToHex(shortenedQuestionId),
                outcomes.length,
                asciiToHex(question),
                outcomes.map(asciiToHex)
            ).subscribe(() => {}, console.error);
        },
        [api, connectedAccount]
    );

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
            {markets && markets.length > 0 ? (
                <span>Yep</span>
            ) : (
                <Flex width="100%" mt={36} justifyContent="center">
                    <Box>
                        <EmptyStateCard text="Still no markets here. Create one with the button above." />
                    </Box>
                </Flex>
            )}
        </Main>
    );
};
