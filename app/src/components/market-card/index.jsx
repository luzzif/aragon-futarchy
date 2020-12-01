import React, { useCallback } from "react";
import { Flex, Box } from "reflexbox";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";
import Timer from "@aragon/ui/dist/Timer";
import Card from "@aragon/ui/dist/Card";
import { OutcomeBar } from "../outcome-bar";
import { DateTime } from "luxon";
import { IconClose } from "@aragon/ui";
import IconWarning from "@aragon/ui/dist/IconWarning";
import { OUTCOME_BAR_COLORS } from "../../constants";

export const MarketCard = ({
    question,
    outcomes,
    endsAt,
    open,
    conditionId,
    onClick,
}) => {
    const theme = useTheme();

    const handleLocalClick = useCallback(() => {
        onClick(conditionId);
    }, [conditionId, onClick]);

    const getStatusAndIcon = () => {
        let icon;
        let text;
        let color;
        if (open) {
            if (DateTime.utc().toSeconds() < endsAt) {
                return <Timer end={endsAt} maxUnits={4} />;
            } else {
                // expired, awaiting finalization
                icon = (
                    <IconWarning
                        css={`
                            display: flex;
                        `}
                    />
                );
                text = "Awaiting finalization";
                color = theme.warning;
            }
        } else {
            icon = (
                <IconClose
                    css={`
                        display: flex;
                    `}
                />
            );
            text = "Closed";
            color = theme.negative;
        }
        return (
            <Flex
                css={`
                    color: ${color};
                    ${textStyle("body2")}
                `}
                alignItems="center"
            >
                <Box size="small">{icon}</Box>
                <Box>{text}</Box>
            </Flex>
        );
    };

    return (
        <Card
            open={open}
            negativeColor={theme.negativeSurface}
            onClick={handleLocalClick}
            height={252}
        >
            <Flex
                width="100%"
                height="100%"
                overflow="hidden"
                flexDirection="column"
                padding="16px 20px"
            >
                <Box
                    mb="16px"
                    lineHeight="27px"
                    height="54px"
                    minHeight="54px"
                    css={`
                        overflow: hidden;
                        ${textStyle("body1")};
                        display: -webkit-box;
                        -webkit-box-orient: vertical;
                        -webkit-line-clamp: 3;
                    `}
                >
                    {question}
                </Box>
                <Flex mb="16px" flexDirection="column">
                    {outcomes.slice(0, 2).map((outcome, index) => (
                        <Box mb="12px" key={outcome.positionId}>
                            <OutcomeBar
                                label={outcome.label}
                                price={outcome.price}
                                color={
                                    OUTCOME_BAR_COLORS[
                                        index % OUTCOME_BAR_COLORS.length
                                    ]
                                }
                            />
                        </Box>
                    ))}
                    <Box height="28px">
                        {outcomes.length > 2 &&
                            `(${outcomes.length - 2} more outcomes hidden...`}
                    </Box>
                </Flex>
                {getStatusAndIcon()}
            </Flex>
        </Card>
    );
};
