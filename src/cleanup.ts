import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { promises as fs, writeFile, writeFileSync } from 'fs';
import path from 'path';
import { buildOutDir, currentJobFileBasename, readInfraForCurrentJob, tmpBuildOutDir } from './deployment-info';
import { stopVirtualTestNet } from './tenderly';
import { parseDeploymentLogs } from './foundry-logs';

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
    clearSensitiveData();
    const mode = core.getInput('mode').toUpperCase();

    const infra = await readInfraForCurrentJob();
    if (!infra) {
      core.warning('No infrastructure information found to cleanup');
      return;
    }

    if (mode === 'CD') {
      core.info('Running in CD mode - skipping TestNet cleanup');
      const deploymentLogs = await parseDeploymentLogs(tmpBuildOutDir());
      await fs.writeFile(`${buildOutDir()}/${currentJobFileBasename()}-deployments.json`, JSON.stringify(deploymentLogs), 'utf-8');
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

async function clearSensitiveData() {
  return await exec.exec('git', ['checkout', '--', '**/foundry.toml']);
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
  await exec.exec('git', ['pull', '--rebase', 'origin', github.context.ref]);
  await exec.exec('git', ['push']);
}



async function testnetLinks() {
  const networks = (await readInfraForCurrentJob())?.networks;

  return Object.values(networks!).map(m => {
    return `${m.chainId}: ${m.adminRpcUrl}`
  }).join("\n");
}

cleanup();