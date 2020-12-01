import React from "react";
import Main from "@aragon/ui/dist/Main";
import SyncIndicator from "@aragon/ui/dist/SyncIndicator";
import { useAragonApi } from "@aragon/api-react";
import { Route, Switch } from "react-router-dom";
import { Markets } from "../markets";
import { Market } from "../market";
import { ThemeProvider } from "styled-components";
import { useTheme } from "@aragon/ui/dist/Theme";
import { Redirect } from "react-router-dom/cjs/react-router-dom.min";

export const App = () => {
    const {
        appState: { syncing },
        guiStyle: { appearance },
    } = useAragonApi();
    const theme = useTheme();

    return (
        <Main theme={appearance}>
            <ThemeProvider theme={theme}>
                {syncing && <SyncIndicator />}
                <Switch>
                    <Route path="/markets/:conditionId">
                        <Market />
                    </Route>
                    <Route path="/markets">
                        <Markets />
                    </Route>
                    <Redirect to="/markets" />
                </Switch>
            </ThemeProvider>
        </Main>
    );
};
