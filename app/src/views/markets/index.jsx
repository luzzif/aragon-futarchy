import React, { useState, useCallback } from "react";
import { useAragonApi } from "@aragon/api-react";
import { asciiToHex, toWei } from "web3-utils";
import { DateTime } from "luxon";
import { Button, EmptyStateCard, Header } from "@aragon/ui";
import { NewMarketSidePanel } from "../../components/new-market-side-panel";
import { Box, Flex } from "reflexbox";
import { MarketCard } from "../../components/market-card";
import { Warning } from "../../components/warning";
import { UndecoratedLink } from "../../components/undecorated-link";

export const Markets = () => {
    const { appState, api, connectedAccount } = useAragonApi();
    const { markets } = appState;

    const [sidePanelOpen, setSidePanelOpen] = useState(false);

    const handleNewMarketOpen = useCallback(() => {
        setSidePanelOpen(true);
    }, []);

    const handleNewMarketClose = useCallback(() => {
        setSidePanelOpen(false);
    }, []);

    const handleMarketCreate = useCallback(
        (question, outcomes, funding, endsAt) => {
            api.createMarket(
                connectedAccount,
                asciiToHex(Date.now().toString().substring(0, 32)),
                outcomes.length,
                asciiToHex(question),
                outcomes.map(asciiToHex),
                parseInt(DateTime.fromISO(endsAt).toJSDate().getTime() / 1000),
                {
                    from: connectedAccount,
                    value: toWei(funding.toString()),
                }
            ).subscribe(() => {}, console.error);
        },
        [api, connectedAccount]
    );

    return (
        <>
            <Header
                primary="Futarchy"
                secondary={
                    <Button
                        mode="strong"
                        label="Create a prediction market"
                        onClick={handleNewMarketOpen}
                    />
                }
            />
            <NewMarketSidePanel
                open={sidePanelOpen}
                onClose={handleNewMarketClose}
                onCreate={handleMarketCreate}
            />
            {markets && markets.length > 0 ? (
                <Flex flexDirection="column">
                    <Box mb="20px" mt="20px" px={3}>
                        <Warning />
                    </Box>
                    <Flex flexWrap="wrap" width="100%">
                        {markets.map((market) => {
                            const { conditionId } = market;
                            return (
                                <Box
                                    width={[1, 1 / 2, 1 / 3]}
                                    key={conditionId}
                                    p={3}
                                >
                                    <UndecoratedLink
                                        to={`/market/${conditionId}`}
                                    >
                                        <MarketCard {...market} />
                                    </UndecoratedLink>
                                </Box>
                            );
                        })}
                    </Flex>
                </Flex>
            ) : (
                <Flex width="100%" mt={36} justifyContent="center">
                    <Box>
                        <EmptyStateCard text="Still no markets here. Create one with the button above." />
                    </Box>
                </Flex>
            )}
        </>
    );
};