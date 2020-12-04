import React, { useState, useCallback, useEffect } from "react";
import { useAragonApi } from "@aragon/api-react";
import { asciiToHex, toWei } from "web3-utils";
import { DateTime } from "luxon";
import { Button, EmptyStateCard, Header } from "@aragon/ui";
import { NewMarketSidePanel } from "../../components/new-market-side-panel";
import { Box, Flex } from "reflexbox";
import { MarketCard } from "../../components/market-card";
import { encodeQuestion } from "../../utils/realitio";
import { REALITIO_TIMEOUT } from "../../constants";
import { GU } from "@aragon/ui/dist/constants";
import { useHistory } from "react-router-dom";
import Bar from "@aragon/ui/dist/Bar";
import DateRangePicker from "@aragon/ui/dist/DateRangePicker";

export const Markets = () => {
    const history = useHistory();
    const { appState, api, connectedAccount, network } = useAragonApi();

    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState({ start: null, end: null });
    const [filteredMarkets, setFilteredMarkets] = useState(
        appState.markets || []
    );

    useEffect(() => {
        if (dateFilter.start && dateFilter.end) {
            const parsedFrom = dateFilter.start.getTime() / 1000;
            const parsedTo = dateFilter.end.getTime() / 1000;
            setFilteredMarkets(
                appState.markets.filter(
                    (market) =>
                        parsedFrom >= market.timestamp &&
                        market.timestamp <= parsedTo
                )
            );
        } else {
            setFilteredMarkets(appState.markets || []);
        }
    }, [appState.markets, dateFilter]);

    const handleNewMarketOpen = useCallback(() => {
        setSidePanelOpen(true);
    }, []);

    const handleNewMarketClose = useCallback(() => {
        setSidePanelOpen(false);
    }, []);

    const handleMarketClick = useCallback(
        (conditionId) => {
            history.push(`/markets/${conditionId}`);
        },
        [history]
    );

    const handleMarketCreate = useCallback(
        (question, outcomes, funding, endsAt) => {
            console.log(
                asciiToHex(question),
                outcomes.map(asciiToHex),
                DateTime.fromISO(endsAt).toSeconds(),
                encodeQuestion(question, outcomes, "Futarchy"),
                REALITIO_TIMEOUT[network.id]
            );
            api.createMarket(
                asciiToHex(question),
                outcomes.map(asciiToHex),
                DateTime.fromISO(endsAt).toSeconds(),
                encodeQuestion(question, outcomes, "Futarchy"),
                REALITIO_TIMEOUT[network.id],
                {
                    from: connectedAccount,
                    value: toWei(funding.toString()),
                }
            ).subscribe(() => {}, console.error);
        },
        [api, connectedAccount, network]
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
            <Bar>
                <div
                    css={`
                        height: ${8 * GU}px;
                        display: grid;
                        grid-template-columns: auto auto auto 1fr;
                        grid-gap: ${1 * GU}px;
                        align-items: center;
                        padding-left: ${3 * GU}px;
                    `}
                >
                    <DateRangePicker
                        startDate={dateFilter.start}
                        endDate={dateFilter.end}
                        onChange={setDateFilter}
                        format="YYYY/MM/DD"
                    />
                </div>
            </Bar>
            {filteredMarkets.length > 0 ? (
                <Flex flexDirection="column">
                    <Flex width="100%" flexWrap="wrap">
                        {filteredMarkets.map((market) => (
                            <Box
                                p="16px"
                                width={["100%", "50%", "50%", "25%"]}
                                key={market.conditionId}
                            >
                                <MarketCard
                                    onClick={handleMarketClick}
                                    {...market}
                                />
                            </Box>
                        ))}
                    </Flex>
                </Flex>
            ) : (
                <Flex width="100%" mt={36} justifyContent="center">
                    <Box>
                        <EmptyStateCard text="There's nothing here." />
                    </Box>
                </Flex>
            )}
            <NewMarketSidePanel
                open={sidePanelOpen}
                onClose={handleNewMarketClose}
                onCreate={handleMarketCreate}
            />
        </>
    );
};
