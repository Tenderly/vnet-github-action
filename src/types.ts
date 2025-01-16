export interface TestNetInputs {
  accessKey: string;
  projectName: string;
  accountName: string;
  testnetName: string;
  networkId: string;
  chainId: number;
  blockNumber: string;
  stateSync: boolean;
  publicExplorer: boolean;
  verificationVisibility: 'bytecode' | 'abi' | 'src';
  testnetSlug?: string;
}

export interface TestNetResponse {
  id: string;
  adminRpcUrl: string;
  publicRpcUrl: string;
}

export interface RpcEndpoint {
  name: string;
  url: string;
}

export interface TenderlyApiResponse {
  id: string;
  rpcs: RpcEndpoint[];
}