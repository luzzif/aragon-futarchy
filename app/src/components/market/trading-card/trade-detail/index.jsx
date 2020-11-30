import React from "react";
import { Box, Flex } from "reflexbox";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";

export const TradeDetail = ({ title, value, currency }) => {
    const theme = useTheme();

    return (
        <Flex mb="4px" justifyContent="space-between" width="100%">
            <Box
                css={`
                    ${textStyle("body3")}
                    color: ${theme.content};
                `}
            >
                {title}
            </Box>
            <Box
                css={`
                    ${textStyle("body3")}
                    color: ${theme.content};
                `}
            >
                {!value || value === "0" ? "-" : value}{" "}
                {value && value !== "0" && currency}
            </Box>
        </Flex>
    );
};
