import React, { useCallback, useState, useEffect } from "react";
import { Flex, Box } from "reflexbox";
import Bar from "@aragon/ui/dist/Bar";
import BackButton from "@aragon/ui/dist/BackButton";
import AuiBox from "@aragon/ui/dist/Box";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import ProgressBar from "@aragon/ui/dist/ProgressBar";
import Radio from "@aragon/ui/dist/Radio";
import { DateTime } from "luxon";
import BigNumber from "bignumber.js";
import Timer from "@aragon/ui/dist/Timer";
import IconCheck from "@aragon/ui/dist/IconCheck";
import Button from "@aragon/ui/dist/Button";
import Info from "@aragon/ui/dist/Info";
import { TradingSidePanel } from "./trading-side-panel";

export const Market = ({
    onBack,
    number,
    conditionId,
    question,
    creator,
    outcomes,
    timestamp,
    endsAt,
    onTrade,
}) => {
    const theme = useTheme();
    const [checked, setChecked] = useState(outcomes[0]);
    const [luxonTimestamp, setLuxonTimestamp] = useState(null);
    const [tradeable, setTradeable] = useState(null);
    const [canSell, setCanSell] = useState(false);
    const [buying, setBuying] = useState(false);
    const [selling, setSelling] = useState(false);

    useEffect(() => {
        setLuxonTimestamp(DateTime.fromSeconds(timestamp));
    }, [timestamp]);

    useEffect(() => {
        setTradeable(endsAt > new Date().getTime() / 1000);
    }, [endsAt]);

    useEffect(() => {
        setCanSell(
            !outcomes.find((outcome) =>
                new BigNumber(outcome.holding).isPositive()
            )
        );
    }, [endsAt]);

    const handleRadioChange = useCallback(
        (index) => {
            setChecked(outcomes[index]);
        },
        [outcomes]
    );

    const handleBuyClick = useCallback(() => {
        setBuying(true);
    }, [outcomes]);

    const handleSellClick = useCallback(() => {
        setSelling(false);
    }, [outcomes]);

    const handleTradingSidePanelClose = useCallback(() => {
        setBuying(false);
        setSelling(false);
    }, [outcomes]);

    const handleTrade = useCallback(
        (buy, outcome, collateralAmount) => {
            const outcomeTokensAmount = outcomes
                .map((mappingOutcome) =>
                    mappingOutcome === outcome
                        ? new BigNumber(collateralAmount)
                              .dividedBy(outcome.price)
                              .decimalPlaces(2)
                              .toNumber()
                        : 0
                )
                .map((amount) => (buy ? amount : -amount));
            onTrade(conditionId, outcomeTokensAmount, collateralAmount);
        },
        [conditionId]
    );

    return (
        <>
            <Flex flexWrap="wrap" pt="16px" width="100%" flexDirection="column">
                <Box>
                    <Bar primary={<BackButton onClick={onBack} />} />
                </Box>
                <Box mb="16px">
                    <Info title="Caution" mode="warning">
                        Before trading on a market, make sure that its outcome
                        will be known by its resolution date and it isn't an
                        invalid market. Be aware that market makers may remove
                        liquidity from the market at any time!
                    </Info>
                </Box>
                <Box mb="16px">
                    <AuiBox width="100%">
                        <Flex
                            width="100%"
                            height="100%"
                            flexDirection="column"
                            p="40px"
                        >
                            <Box mb="24px">
                                <span
                                    css={`
                                    ${textStyle("title1")}
                                    color: ${theme.content};
                                `}
                                >
                                    Prediction market #{number}
                                </span>
                            </Box>
                            <Box
                                mb="8px"
                                css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                            >
                                Created by
                            </Box>
                            <Box mb="24px">
                                <IdentityBadge
                                    entity={creator}
                                    badgeOnly
                                    shorten
                                />
                            </Box>
                            <Box
                                mb="8px"
                                css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                            >
                                Open since
                            </Box>
                            <Box
                                mb="24px"
                                css={`
                                ${textStyle("body2")}
                                color: ${theme.content};
                            `}
                            >
                                {luxonTimestamp &&
                                    luxonTimestamp.toLocaleString(
                                        DateTime.DATETIME_SHORT
                                    )}
                            </Box>
                            <Box
                                mb="8px"
                                css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                            >
                                Question
                            </Box>
                            <Box
                                mb="24px"
                                css={`
                                ${textStyle("body2")}
                                color: ${theme.content};
                            `}
                            >
                                {question}
                            </Box>
                            <Box
                                mb="8px"
                                css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                            >
                                Outcomes
                            </Box>
                            {outcomes.map((outcome, index) => {
                                const prettyPrice = new BigNumber(
                                    outcome.price
                                );
                                return (
                                    <Flex
                                        key={index}
                                        height="40px"
                                        alignItems="center"
                                        width="100%"
                                        mb="16px"
                                    >
                                        {tradeable && (
                                            <Box mr="16px">
                                                <Radio
                                                    id={index}
                                                    checked={
                                                        checked === outcome
                                                    }
                                                    onChange={handleRadioChange}
                                                />
                                            </Box>
                                        )}
                                        <Flex
                                            flexDirection="column"
                                            width="100%"
                                        >
                                            <Box
                                                css={`
                                                    ${textStyle("label2")}
                                                `}
                                                mb="4px"
                                            >
                                                {outcome.label} (
                                                {prettyPrice
                                                    .multipliedBy("100")
                                                    .decimalPlaces(2)
                                                    .toString()}
                                                %)
                                            </Box>
                                            <Box>
                                                <ProgressBar
                                                    value={prettyPrice.toNumber()}
                                                />
                                            </Box>
                                        </Flex>
                                    </Flex>
                                );
                            })}
                            {tradeable && (
                                <Flex mt="16px" justifyContent="space-around">
                                    <Button
                                        mode="positive"
                                        onClick={handleBuyClick}
                                    >
                                        Buy
                                    </Button>
                                    <Button
                                        mode="negative"
                                        disabled={!canSell}
                                        onClick={handleSellClick}
                                    >
                                        Sell
                                    </Button>
                                </Flex>
                            )}
                        </Flex>
                    </AuiBox>
                    <AuiBox width="100%" heading="Status" padding={20}>
                        <Flex width="100%" height="100%" flexDirection="column">
                            <Flex
                                mb="8px"
                                css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                                display="flex"
                                alignItems="center"
                                height="30px"
                            >
                                {tradeable && (
                                    <>
                                        <Box mr="8px">
                                            <IconCheck />
                                        </Box>
                                        <Box
                                            css={`
                                            ${textStyle("body1")}
                                            color: ${theme.contentSecondary};
                                        `}
                                            pb="4px"
                                        >
                                            Open for trade
                                        </Box>
                                    </>
                                )}
                            </Flex>
                            <Box>
                                {tradeable && (
                                    <Timer end={new Date(endsAt * 1000)} />
                                )}
                            </Box>
                        </Flex>
                    </AuiBox>
                </Box>
            </Flex>
            <TradingSidePanel
                open={buying || selling}
                onClose={handleTradingSidePanelClose}
                buy={buying}
                outcome={checked}
                onTrade={handleTrade}
            />
        </>
    );
};
