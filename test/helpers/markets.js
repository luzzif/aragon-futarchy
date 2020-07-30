const { fromAscii, toWei } = require("web3-utils");

const newMarket = async (
    app,
    user,
    question,
    outcomes,
    endsAt,
    etherCollateral
) => {
    const rawQuestionId = Date.now().toString();
    return app.createMarket(
        user,
        fromAscii(rawQuestionId),
        2,
        fromAscii(question),
        outcomes.map(fromAscii),
        endsAt,
        { from: user, value: toWei(etherCollateral) }
    );
};

module.exports = {
    newMarket,
};
