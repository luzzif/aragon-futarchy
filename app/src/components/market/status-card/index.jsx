import React from "react";
import AuiBox from "@aragon/ui/dist/Box";
import { Box, Flex } from "reflexbox";
import IconWarning from "@aragon/ui/dist/IconWarning";
import IconCheck from "@aragon/ui/dist/IconCheck";
import { IconError } from "@aragon/ui";
import { textStyle } from "@aragon/ui/dist/text-styles";
import Timer from "@aragon/ui/dist/Timer";
import { useTheme } from "@aragon/ui/dist/Theme";

export const StatusCard = ({ open, endsAt, expired, tradeable }) => {
    const theme = useTheme();

    const getStatusIcon = () => {
        if (open) {
            if (expired) {
                return <IconWarning />;
            } else {
                return <IconCheck />;
            }
        } else {
            return <IconError />;
        }
    };

    const getStatusText = () => {
        if (open) {
            if (expired) {
                return "Expired";
            } else {
                return "Tradeable";
            }
        } else {
            return "Closed";
        }
    };

    const getStatusColor = () => {
        if (open) {
            if (expired) {
                return theme.negative.toString();
            } else {
                return theme.positive.toString();
            }
        } else {
            return theme.negative.toString();
        }
    };

    return (
        <AuiBox heading="Status">
            <Flex flexDirection="column">
                <Flex alignItems="center">
                    <Box color={getStatusColor()} mr="2px">
                        {getStatusIcon()}
                    </Box>
                    <Box
                        color={getStatusColor()}
                        css={`
                            ${textStyle("body2")}
                        `}
                        pb="4px"
                    >
                        {getStatusText()}{" "}
                    </Box>
                </Flex>
                {tradeable && (
                    <Box mt="8px">
                        <Timer end={new Date(endsAt * 1000)} />
                    </Box>
                )}
            </Flex>
        </AuiBox>
    );
};
