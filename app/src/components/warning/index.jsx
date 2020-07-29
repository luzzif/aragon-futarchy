import React from "react";
import Info from "@aragon/ui/dist/Info";

export const Warning = () => (
    <Info title="Caution" mode="warning">
        Before trading on a market, make sure that its outcome will be known by
        its resolution date and it isn't an invalid market.
        <br />
        Be aware that market makers may remove liquidity from the market at any
        time!
    </Info>
);
