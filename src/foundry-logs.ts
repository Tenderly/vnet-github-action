import { promises as fs } from 'fs';
import path from 'path';
import * as github from '@actions/github';
import { readInfraForCurrentJob } from './deployment-info';

interface WorkflowInfo {
  runNumber: number;
  workflow: string;
  job: string;
  runId: number;
}

interface Contract {
  address: string;
  chain: string;
  verificationStatus: string | null;
  compiler: string | null;
  optimizations: number | null;
  contractPath: string;
  contractName: string;
}

interface VirtualTestNet {
  id: string;
  adminRpcUrl: string;
  publicRpcUrl: string;
  networkId: string;
  chainId: number;
  testnetSlug: string;
  explorerUrl?: string;
}

interface DeploymentGroup {
  virtualTestNet: VirtualTestNet;
  contracts: Contract[];
}

interface ParsedDeployments {
  workflow: WorkflowInfo;
  deployments: DeploymentGroup[];
}

function extractRunNumber(filename: string): number {
  const match = filename.match(/^(\d+)-/);
  if (!match) {
    throw new Error(`Unable to extract run number from filename: ${filename}`);
  }
  return parseInt(match[1], 10);
}

async function parseDeploymentLogs(dirPath: string): Promise<ParsedDeployments> {
  const files = await fs.readdir(dirPath);
  const jsonFiles = files.filter(file => path.extname(file) === '.json');
  
  const workflowInfo: WorkflowInfo = {
    runNumber: github.context.runNumber,
    workflow: github.context.workflow,
    job: github.context.job,
    runId: github.context.runId
  };

  const deploymentGroups: DeploymentGroup[] = [];
  const infraInfo = await readInfraForCurrentJob();

  if (!infraInfo) {
    throw new Error('No infrastructure information found');
  }

  for (const file of jsonFiles) {
    const filePath = path.join(dirPath, file);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');

    let currentContract: Partial<Contract> = {};
    const contracts: Contract[] = [];
    let isInDeploymentSection = false;

    for (const line of lines) {
      if (line.trim() === '##') {
        isInDeploymentSection = true;
        continue;
      }

      if (isInDeploymentSection) {
        if (line.includes('Start verifying contract')) {
          if (Object.keys(currentContract).length > 0) {
            contracts.push(currentContract as Contract);
          }
          currentContract = {
            address: line.match(/`(0x[a-fA-F0-9]+)`/)?.[1] || '',
            chain: line.match(/deployed on (\d+)/)?.[1] || '',
            verificationStatus: null
          };
        } else if (line.includes('Compiler version:')) {
          currentContract.compiler = line.split(':')[1]?.trim() || null;
        } else if (line.includes('Optimizations:')) {
          currentContract.optimizations = parseInt(line.split(':')[1]?.trim()) || null;
        } else if (line.includes('Submitting verification for')) {
          const contractMatch = line.match(/\[(.*?)\]/);
          if (contractMatch) {
            const [contractPath, contractName] = contractMatch[1].split(':');
            currentContract.contractPath = contractPath;
            currentContract.contractName = contractName;
          }
        } else if (line.includes('Contract verification status:')) {
          currentContract.verificationStatus = lines[lines.indexOf(line) + 1]?.match(/Response: `(.+)`/)?.[1] || null;
        }
      }
    }

    if (Object.keys(currentContract).length > 0) {
      contracts.push(currentContract as Contract);
    }

    // Match contracts with their virtual testnet based on chainId
    for (const network of Object.values(infraInfo.networks)) {
      const matchingContracts = contracts.filter(
        contract => contract.chain === network.chainId.toString()
      );

      if (matchingContracts.length > 0) {
        deploymentGroups.push({
          virtualTestNet: network,
          contracts: matchingContracts
        });
      }
    }
  }

  return {
    workflow: workflowInfo,
    deployments: deploymentGroups
  };
}

export {
  parseDeploymentLogs,
  ParsedDeployments,
  DeploymentGroup,
  Contract,
  VirtualTestNet,
  WorkflowInfo
};