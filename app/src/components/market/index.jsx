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
import { abi as realitioAbi } from "@realitio/realitio-contracts/truffle/build/contracts/Realitio.json";
import Link from "@aragon/ui/dist/Link";
import { BalancesCard } from "./balances-card";
import { MAX_SIGNED_32_BITS_INTEGER } from "../../constants";

export const Market = ({
    onBack,
    question,
    realitioQuestionId,
    timestamp,
    creator,
    conditionId,
    outcomes,
    endsAt,
    open,
    onClose,
    collateralToken,
}) => {
    const { api } = useAragonApi();

    const [tradeable, setTradeable] = useState(null);
    const [finalized, setFinalized] = useState(null);
    const [expired, setExpired] = useState(false);
    const [redeemable, setRedeemable] = useState(false);

    useEffect(() => {
        const now = Date.now();
        const expired = endsAt < parseInt(now / 1000);
        setExpired(expired);
        if (!expired) {
            const marketExpirationTimeout = endsAt * 1000 - now;
            // setTimeout stores delay value in 32 bit numbers, so
            // we avoid overflow and inconsistent behavior with this check
            if (marketExpirationTimeout < MAX_SIGNED_32_BITS_INTEGER) {
                // if the market is not expired we set up a timeout to update
                // the component's state once it actually expires.
                const timer = setTimeout(
                    () => setExpired(true),
                    marketExpirationTimeout
                );
                return () => {
                    clearTimeout(timer);
                };
            }
        }
    }, [endsAt]);

    useEffect(() => {
        const findAndSetCloseable = async () => {
            const realitioInstance = api.external(
                await api.call("realitio").toPromise(),
                realitioAbi
            );
            const finalized = await realitioInstance
                .isFinalized(realitioQuestionId)
                .toPromise();
            setFinalized(finalized);
        };
        findAndSetCloseable();
    }, [api, realitioQuestionId]);

    useEffect(() => {
        setTradeable(open && !expired);
    }, [open, expired]);

    useEffect(() => {
        setRedeemable(
            !open &&
                outcomes.find((outcome) =>
                    new BigNumber(outcome.balance).isGreaterThan("0")
                )
        );
    }, [endsAt, open, outcomes]);

    const handleRedeemPositions = useCallback(async () => {
        const conditionalTokensInstance = api.external(
            await api.call("conditionalTokens").toPromise(),
            conditionalTokensAbi
        );
        const collateralTokenAddress = await api
            .call("collateralToken")
            .toPromise();
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

    const getActionContent = () => {
        if (finalized === false && expired) {
            return (
                <Link
                    href={`https://reality.eth.link/app/#!/question/${realitioQuestionId}`}
                    css={`
                        text-decoration: none;
                        outline: none;
                    `}
                >
                    <Button mode="positive">Finalize on Reality.eth</Button>
                </Link>
            );
        } else if (finalized && open) {
            return (
                <Button mode="negative" onClick={onClose}>
                    Close market
                </Button>
            );
        } else if (redeemable) {
            return (
                <Button mode="positive" onClick={handleRedeemPositions}>
                    Redeem positions
                </Button>
            );
        } else {
            return "No actions to perform";
        }
    };

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
                                    <Box mb="20px">
                                        {tradeable ? (
                                            <TradingCard
                                                tradeable={tradeable}
                                                outcomes={outcomes}
                                                conditionId={conditionId}
                                                collateralToken={
                                                    collateralToken
                                                }
                                            />
                                        ) : (
                                            <BalancesCard outcomes={outcomes} />
                                        )}
                                    </Box>
                                    <Box mb="20px">
                                        <AuiBox width="100%" heading="Actions">
                                            {getActionContent()}
                                        </AuiBox>
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
