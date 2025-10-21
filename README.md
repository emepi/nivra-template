# Nivra Template

![main_view](/pictures/view.png)

## Installation

1. Deploy [**nivra smart contracts**](https://github.com/NivraLabs/nivra-court) in the devnet environment.
<br><br>
2. Copy **court_registry** and **package** addresses from the object changes output to `src/constants.tsx`.
![court_registry](/pictures/court_registry.png)
![package](/pictures/package.png)
<br><br>
3. Copy the **object type** for NVR coin to `src/constants.tsx`.
![nvr_type](/pictures/nvr_type.png)
<br><br>
4. Deploy [**packages/contract_kit**](https://github.com/NivraLabs/nivra-court) in the devnet environment and copy package id to `src/constants.tsx`.

## Starting your dApp

To install dependencies you can run

```bash
npm install
```

To start your dApp in development mode run

```bash
npm run dev
```