import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { promises as fs } from 'fs';
import { buildOutDir, currentJobFileBasename, infraFileForCurrentJob, InfrastructureInfo, readInfraForCurrentJob, tmpBuildOutDir } from './deployment-info';
import { ParsedDeployments, parseDeploymentLogs } from './foundry-logs';
import { stopVirtualTestNet } from './tenderly';

cleanup();

async function cleanup(): Promise<void> {
  try {
    await clearSensitiveData();
    const mode = core.getInput('mode').toUpperCase();

    const infra = await readInfraForCurrentJob();
    if (!infra) {
      core.warning('No infrastructure information found to cleanup');
      return;
    }

    if (mode === 'CD') {
      core.info('Running in CD mode - persisting deployment info');
      await persistDeploymentInfo();
      // push foundry deployment info in .tenderly./ or hardhat-ignition + all the files frameworks produced
      await push();
      core.info("Keeping containers ON in CD mode");
    }

    if (mode === 'CI') {
      await pauseVirtualTestNet(infra);
    }
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to stop Virtual TestNet: ${err.message}`);
  }
}

async function clearSensitiveData() {
  core.debug("Clearing sensitive data: admin RPC etc");
  await exec.exec('git', ['checkout', '--', '"**/foundry.toml"']);
  await hideAdminRpc();
}

async function hideAdminRpc(){
  const infra = JSON.parse(await fs.readFile(infraFileForCurrentJob(), 'utf8')) as InfrastructureInfo;
  infra.networks = Object.fromEntries(Object.entries(infra.networks).map(([key, network]) => {
    network.adminRpcUrl = '';
    return [key, network];
  }));
  await fs.writeFile(infraFileForCurrentJob(), JSON.stringify(infra, null, 2));
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
    return `${m.chainId}: ${m.publicRpcUrl}`
  }).join("\n");
}

async function persistDeployment(deploymentLogs: ParsedDeployments) {
  await fs.writeFile(`${buildOutDir()}/${currentJobFileBasename()}-deployments.json`, JSON.stringify(deploymentLogs, null, 2), 'utf-8');
}

async function persistDeploymentInfo() {
  const deploymentInfo = await parseDeploymentLogs(tmpBuildOutDir());
  // remove tmp out dir after parsing - no need for that anymore
  await fs.rm(tmpBuildOutDir(), { recursive: true });
  // persist only if there are deployments present
  if (deploymentInfo.deployments.length > 0) {
    core.debug(JSON.stringify(deploymentInfo, null, 2));
    await persistDeployment(deploymentInfo);
  }
}

async function pauseVirtualTestNet(infra: InfrastructureInfo) {
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
}