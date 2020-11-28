import React from "react";
import Link from "@aragon/ui/dist/Link";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import { DateTime } from "luxon";
import { Section } from "../../section";
import Distribution from "@aragon/ui/dist/Distribution";
import { Flex } from "reflexbox";
import AuiBox from "@aragon/ui/dist/Box";
import BigNumber from "bignumber.js";
import { Split } from "@aragon/ui/dist/Split";

export const InfoCard = ({
    realitioQuestionId,
    question,
    creator,
    timestamp,
    outcomes,
}) => {
    return (
        <AuiBox width="100%">
            <Flex width="100%" height="100%" flexDirection="column">
                <Split
                    primary={<Section title="Question">{question}</Section>}
                    secondary={
                        <Section title="Created by">
                            <IdentityBadge entity={creator} badgeOnly shorten />
                        </Section>
                    }
                />
                <Split
                    primary={
                        <Section title="Open since">
                            {timestamp &&
                                DateTime.fromSeconds(timestamp).toLocaleString(
                                    DateTime.DATETIME_SHORT
                                )}
                        </Section>
                    }
                    secondary={
                        <Section title="Realitio">
                            <Link
                                href={`https://reality.eth.link/app/#!/question/${realitioQuestionId}`}
                            >
                                See on Reality.eth
                            </Link>
                        </Section>
                    }
                />
                <Section title="Outcomes">
                    <Distribution
                        items={outcomes.map((outcome) => ({
                            item: outcome.label,
                            percentage: new BigNumber(outcome.price)
                                .multipliedBy("100")
                                .decimalPlaces(2)
                                .toNumber(),
                        }))}
                    />
                </Section>
            </Flex>
        </AuiBox>
    );
};
