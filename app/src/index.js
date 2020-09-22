import "core-js/stable";
import "regenerator-runtime/runtime";
import React from "react";
import ReactDOM from "react-dom";
import { AragonApi } from "@aragon/api-react";
import { App } from "./views/app";
import { HashRouter } from "react-router-dom";

const reducer = (state) => {
    if (!state) {
        return { syncing: true, markets: [], selectedAccount: null };
    }
    return { ...state };
};

ReactDOM.render(
    <AragonApi reducer={reducer}>
        <HashRouter>
            <App />
        </HashRouter>
    </AragonApi>,
    document.getElementById("root")
);
