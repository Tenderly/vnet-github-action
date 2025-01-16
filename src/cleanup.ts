import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { promises as fs } from 'fs';
import path from 'path';
import { buildOutDir, readInfraForCurrentJob, tmpBuildOutDir } from './deployment-info';
import { stopVirtualTestNet } from './tenderly';

interface DeploymentVerification {
  status: string | null;
  details: string | null;
}

interface Deployment {
  address: string | null;
  chain: string | null;
  compiler?: string | null;
  optimizations?: number | null;
  contractPath?: string;
  contractName?: string;
  guid?: string | null;
  url?: string | null;
  verification: DeploymentVerification[];
}

interface ProcessingResult {
  generalPath?: string;
  deployedPath?: string;
  stats?: {
    generalLogs: number;
    deployments: number;
  };
  error?: string;
}

async function cleanup(): Promise<void> {
  try {

    const mode = core.getInput('mode').toUpperCase();

    const infra = await readInfraForCurrentJob();
    if (!infra) {
      core.warning('No infrastructure information found to cleanup');
      return;
    }

    if (mode === 'CD') {
      core.info('Running in CD mode - skipping TestNet cleanup');
      await splitLogFiles(tmpBuildOutDir(), buildOutDir());
      await push();
      core.info("Keeping containers on in CD mode");
      return; 
    }

    const baseInputs = {
      accessKey: core.getInput('access_key'),
      projectName: process.env.TENDERLY_PROJECT_NAME || '',
      accountName: process.env.TENDERLY_ACCOUNT_NAME || '',
    };

    await Promise.allSettled(
      Object.values(infra.networks).map(async (network) => {
        try {
          await stopVirtualTestNet({
            ...baseInputs,
            testnetId: network.id
          });
          core.info(`Stopped Virtual TestNet ${network.id} for network ${network.networkId}`);
          return network.id;
        } catch (error) {
          const err = error as Error;
          core.warning(`Failed to stop TestNet ${network.id}: ${err.message}`);
          throw error;
        }
      })
    );

    core.info('Virtual TestNet stopped successfully');
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to stop Virtual TestNet: ${err.message}`);
  }
}

async function push(): Promise<void> {
  const pushOnComplete = core.getBooleanInput('push_on_complete');
  if (!pushOnComplete) return;
  await exec.exec('git', ['config', '--global', 'user.name', `GitHub Action${github.context.workflow}`]);
  await exec.exec('git', ['config', '--global', 'user.email', 'action@github.com']);

  const token = process.env.GITHUB_TOKEN;
  const repo = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`;


  await exec.exec('git', ['remote', 'set-url', 'origin',
    `https://x-access-token:${token}@${repo.replace('https://', '')}`]);
  await exec.exec('git', ['add', '.']);
  await exec.exec('git', ['commit', '-m',
    `[skip actions] GitHub Action ${github.context.workflow} Deployed contracts\n\n${await testnetLinks()}`]);
  await exec.exec('git', ['reset', '--hard', 'HEAD']);
  await exec.exec('git', ['pull', '--rebase', 'origin', 'main']);
  await exec.exec('git', ['push']);
}

async function splitLogFiles(dirPath: string, outDirPath: string): Promise<Record<string, ProcessingResult>> {
  try {
    const files = await fs.readdir(dirPath);
    const jsonFiles = files.filter(file => path.extname(file) === '.json');

    const results: Record<string, ProcessingResult> = {};

    for (const file of jsonFiles) {
      const filePath = path.join(dirPath, file);
      const baseName = path.basename(file, '.json');

      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');

        const generalLogs: any[] = [];
        const deploymentInfo: Deployment[] = [];
        let isInDeploymentSection = false;
        let currentDeployment: Deployment = {
          address: null,
          chain: null,
          verification: []
        };

        for (const line of lines) {
          if (line.trim() === '##') {
            isInDeploymentSection = true;
            continue;
          }

          if (isInDeploymentSection) {
            if (line.includes('Start verifying contract')) {
              if (Object.keys(currentDeployment).length > 0) {
                deploymentInfo.push(currentDeployment);
              }
              currentDeployment = {
                address: line.match(/`(0x[a-fA-F0-9]+)`/)?.[1] || null,
                chain: line.match(/deployed on (\d+)/)?.[1] || null,
                verification: []
              };
            } else if (line.includes('Compiler version:')) {
              currentDeployment.compiler = line.split(':')[1]?.trim() || null;
            } else if (line.includes('Optimizations:')) {
              currentDeployment.optimizations = parseInt(line.split(':')[1]?.trim()) || null;
            } else if (line.includes('Submitting verification for')) {
              const contractMatch = line.match(/\[(.*?)\]/);
              if (contractMatch) {
                const [contractPath, contractName] = contractMatch[1].split(':');
                currentDeployment.contractPath = contractPath;
                currentDeployment.contractName = contractName;
              }
            } else if (line.includes('GUID:')) {
              currentDeployment.guid = line.match(/`(0x[a-fA-F0-9]+)`/)?.[1] || null;
            } else if (line.includes('Contract verification status:')) {
              currentDeployment.verification.push({
                status: lines[lines.indexOf(line) + 1]?.match(/Response: `(.+)`/)?.[1] || null,
                details: lines[lines.indexOf(line) + 2]?.match(/Details: `(.+)`/)?.[1] || null
              });
            }
          }
        }

        if (Object.keys(currentDeployment).length > 0) {
          deploymentInfo.push(currentDeployment);
        }

        const deployedPath = path.join(outDirPath, `deployed-${baseName}.json`);

        await fs.writeFile(deployedPath, JSON.stringify(deploymentInfo, null, 2));
        
        core.info(`Contract deployment info saved to ${deployedPath}`);
        
        results[file] = {
          deployedPath,
          stats: {
            generalLogs: generalLogs.length,
            deployments: deploymentInfo.length
          }
        };

      } catch (error) {
        const err = error as Error;
        results[file] = { error: `Failed to process file: ${err.message}` };
      }
    }

    return results;

  } catch (error) {
    const err = error as Error;
    throw new Error(`Failed to process directory: ${err.message}`);
  }
}

async function testnetLinks() {
  const networks = (await readInfraForCurrentJob())?.networks;

  return Object.values(networks!).map(m => {
    return `${m.chainId}: ${m.adminRpcUrl}`
  }).join("\n");
}

cleanup();