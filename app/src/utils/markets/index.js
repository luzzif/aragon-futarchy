import { MARKET_STATUSES } from "../../constants";

export const getMarketStatus = (market) => {
    const { open, endsAt } = market;
    const expired = endsAt < parseInt(Date.now() / 1000);
    if (open) {
        return !expired
            ? MARKET_STATUSES.OPEN
            : MARKET_STATUSES.AWAITING_FINALIZATION;
    } else {
        return MARKET_STATUSES.CLOSED;
    }
};
