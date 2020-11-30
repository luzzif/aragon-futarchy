import React, { useCallback, useState, useEffect } from "react";
import { Flex, Box } from "reflexbox";
import Bar from "@aragon/ui/dist/Bar";
import BackButton from "@aragon/ui/dist/BackButton";
import AuiBox from "@aragon/ui/dist/Box";
import BigNumber from "bignumber.js";
import Button from "@aragon/ui/dist/Button";
import { useAragonApi } from "@aragon/api-react";
import { asciiToHex } from "web3-utils";
import conditionalTokensAbi from "../../abi/conditional-tokens.json";
import { InfoCard } from "./info-card";
import { Split } from "@aragon/ui/dist/Split";
import Header from "@aragon/ui/dist/Header";
import { StatusCard } from "./status-card";
import { TradingCard } from "./trading-card";

export const Market = ({
    onBack,
    question,
    realitioQuestionId,
    timestamp,
    creator,
    conditionId,
    realitioTimeout,
    outcomes,
    endsAt,
    redeemed,
    open,
    onClose,
}) => {
    const { api } = useAragonApi();

    const [tradeable, setTradeable] = useState(null);
    const [expired, setExpired] = useState(false);
    const [realitioTimeoutExpired, setRealitioTimeoutExpired] = useState(false);
    const [redeemable, setRedeemable] = useState(false);

    useEffect(() => {
        setExpired(endsAt < parseInt(Date.now() / 1000));
    }, [endsAt]);

    useEffect(() => {
        setRealitioTimeoutExpired(
            parseInt(endsAt) + parseInt(realitioTimeout) <
                parseInt(Date.now() / 1000)
        );
    }, [endsAt, realitioTimeout]);

    useEffect(() => {
        setTradeable(open && !expired);
    }, [open, expired]);

    useEffect(() => {
        setRedeemable(
            !open &&
                !redeemed &&
                outcomes.find((outcome) =>
                    new BigNumber(outcome.balance).isGreaterThan("0")
                )
        );
    }, [endsAt, open, outcomes, redeemed]);

    const handleRedeemPositions = useCallback(async () => {
        const conditionalTokensInstance = api.external(
            await api.call("conditionalTokens").toPromise(),
            conditionalTokensAbi
        );
        const collateralTokenAddress = await api.call("weth9Token").toPromise();
        try {
            await conditionalTokensInstance
                .redeemPositions(
                    collateralTokenAddress,
                    asciiToHex(""),
                    asciiToHex(conditionId),
                    outcomes.map((_, index) => 1 << index)
                )
                .toPromise();
        } catch (error) {
            console.error("could not redeem positions", error);
        }
    }, [api, conditionId, outcomes]);

    return (
        <>
            <Header primary="Futarchy" />
            <Flex flexWrap="wrap" width="100%" flexDirection="column">
                <Box>
                    <Bar primary={<BackButton onClick={onBack} />} />
                </Box>
                <Box>
                    <Split
                        primary={
                            <InfoCard
                                realitioQuestionId={realitioQuestionId}
                                question={question}
                                creator={creator}
                                timestamp={timestamp}
                                expired={expired}
                                tradeable={tradeable}
                                outcomes={outcomes}
                                endsAt={endsAt}
                            />
                        }
                        secondary={
                            <>
                                <Flex flexDirection="column">
                                    <Box mb="20px">
                                        <StatusCard
                                            endsAt={endsAt}
                                            expired={expired}
                                            open={open}
                                            tradeable={tradeable}
                                        />
                                    </Box>
                                    {tradeable && (
                                        <Box mb="20px">
                                            <TradingCard
                                                tradeable={tradeable}
                                                outcomes={outcomes}
                                                conditionId={conditionId}
                                            />
                                        </Box>
                                    )}
                                    <Box mb="20px">
                                        {((!tradeable &&
                                            open &&
                                            realitioTimeoutExpired) ||
                                            redeemable) && (
                                            <AuiBox
                                                width="100%"
                                                heading="Actions"
                                            >
                                                {!tradeable &&
                                                    realitioTimeoutExpired &&
                                                    open && (
                                                        <Button
                                                            mode="negative"
                                                            onClick={onClose}
                                                        >
                                                            Close market
                                                        </Button>
                                                    )}
                                                {redeemable && (
                                                    <Button
                                                        mode="positive"
                                                        onClick={
                                                            handleRedeemPositions
                                                        }
                                                    >
                                                        Redeem positions
                                                    </Button>
                                                )}
                                            </AuiBox>
                                        )}
                                    </Box>
                                </Flex>
                            </>
                        }
                    />
                </Box>
            </Flex>
        </>
    );
};
