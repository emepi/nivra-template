import React from "react";
import ReactDOM from "react-dom/client";
import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Theme } from "@radix-ui/themes";
import App from "./App.js";
import { networkConfig } from "./networkConfig.ts";
import { createBrowserRouter, RouterProvider } from "react-router";
import NavBar from "./components/NavBar.jsx";
import Admin from "./pages/Admin.jsx";
import Faucet from "./pages/Faucet.jsx"
import MyCases from "./pages/MyCases.jsx"
import NivraCourt from "./pages/NivraCourt.jsx"

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
  },
  {
    path: "/admin",
    Component: Admin,
  },
  {
    path: "/faucet",
    Component: Faucet,
  },
  {
    path: "/cases",
    Component: MyCases,
  },
  {
    path: "/cases/:dispute_id",
    Component: NivraCourt,
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme appearance="dark">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider autoConnect>
            <div>
              <NavBar />
              <RouterProvider router={router} />
            </div>
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
    </Theme>
  </React.StrictMode>,
);
