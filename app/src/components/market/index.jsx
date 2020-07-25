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
import IconChart from "@aragon/ui/dist/IconChart";

export const Market = ({
    onBack,
    odds,
    number,
    question,
    creator,
    outcomes,
    timestamp,
}) => {
    const theme = useTheme();
    const [checked, setChecked] = useState(outcomes[0]);
    const [luxonTimestamp, setLuxonTimestamp] = useState(null);

    useEffect(() => {
        setLuxonTimestamp(DateTime.fromSeconds(timestamp));
    }, [timestamp]);

    const handleRadioChange = useCallback(
        (outcome) => {
            setChecked(outcome);
        },
        [outcomes]
    );

    return (
        <Flex flexWrap="wrap" pt="16px" width="100%" flexDirection="column">
            <Box mb="16px">
                <Bar primary={<BackButton onClick={onBack} />} />
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
                            Created by
                        </Box>
                        <Box mb="24px">
                            <IdentityBadge entity={creator} badgeOnly shorten />
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
                            const odd = odds[index];
                            return (
                                <Flex
                                    key={outcome}
                                    height="40px"
                                    alignItems="center"
                                    width="100%"
                                    mb="16px"
                                >
                                    <Box mr="16px">
                                        <Radio
                                            id={outcome}
                                            checked={checked === outcome}
                                            onChange={handleRadioChange}
                                        />
                                    </Box>
                                    <Flex flexDirection="column" width="100%">
                                        <Box
                                            css={`
                                                ${textStyle("label2")}
                                            `}
                                            mb="4px"
                                        >
                                            {outcome} ({odd}%)
                                        </Box>
                                        <Box>
                                            <ProgressBar value={odd} />
                                        </Box>
                                    </Flex>
                                </Flex>
                            );
                        })}
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
                            <Box mr="8px">
                                <IconChart />
                            </Box>
                            <Box pb="4px">Open for trade</Box>
                        </Flex>
                        <Box>
                            Open since{" "}
                            {luxonTimestamp &&
                                luxonTimestamp.toLocaleString(
                                    DateTime.DATETIME_SHORT
                                )}
                        </Box>
                    </Flex>
                </AuiBox>
            </Box>
        </Flex>
    );
};
