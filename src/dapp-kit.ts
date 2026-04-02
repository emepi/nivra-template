import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { NETWORK_CONFIG } from './constants';

export const dAppKit = createDAppKit({
	networks: [
        'testnet',
    ],
    defaultNetwork: 'testnet',

	createClient(network) {
        const config = NETWORK_CONFIG[network];
		return new SuiGrpcClient({ network, baseUrl: config.grpcUrl })
	},
});

// global type registration necessary for the hooks to work correctly
declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}