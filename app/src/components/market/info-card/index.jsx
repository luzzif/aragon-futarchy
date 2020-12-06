import React from "react";
import Link from "@aragon/ui/dist/Link";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import { DateTime } from "luxon";
import { Section } from "../../section";
import { Box, Flex } from "reflexbox";
import AuiBox from "@aragon/ui/dist/Box";
import { Split } from "@aragon/ui/dist/Split";
import { OutcomeBar } from "../../outcome-bar";
import { OUTCOME_BAR_COLORS } from "../../../constants";

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
                        <Section title="Opened">
                            {timestamp &&
                                DateTime.fromSeconds(timestamp).toLocaleString(
                                    DateTime.DATETIME_SHORT
                                )}
                        </Section>
                    }
                    secondary={
                        <Section title="Reality.eth">
                            <Link
                                href={`https://reality.eth.link/app/#!/question/${realitioQuestionId}`}
                            >
                                See Reality.eth question
                            </Link>
                        </Section>
                    }
                />
                <Section title="Outcomes">
                    <Flex flexDirection="column">
                        {outcomes.map((outcome, index) => (
                            <Box key={outcome.positionId} mb="12px">
                                <OutcomeBar
                                    label={outcome.label}
                                    price={outcome.price}
                                    balance={outcome.balance}
                                    color={
                                        OUTCOME_BAR_COLORS[
                                            index % OUTCOME_BAR_COLORS.length
                                        ]
                                    }
                                />
                            </Box>
                        ))}
                    </Flex>
                </Section>
            </Flex>
        </AuiBox>
    );
};
