import * as core from '@actions/core';
import * as github from '@actions/github';
import * as io from '@actions/io';
import { existsSync, promises as fs } from 'fs';
import path from 'path';
import { TestNetResponse } from './types';

export const deploymentsDir = path.join(process.env.GITHUB_WORKSPACE || '', '/.tenderly');
export const tmpBuildOutDir = (): string => path.join(deploymentsDir, 'tmp');
export const buildOutDir = (): string => deploymentsDir;
export const infraDir = () => path.join(deploymentsDir, 'infra');

export interface InfrastructureInfo {
  networks: Record<string, NetworkInfo>;
  timestamp: string;
  githubContext: {
    workflow: string;
    runId: string;
    runNumber: string;
    job: string;
  };
}

export interface NetworkInfo extends TestNetResponse {
  networkId: string;
  chainId: number;
  testnetSlug: string;
  explorerUrl?: string;
}

export async function setupDeploymentsFolder(): Promise<void> {
  const tmpDir = tmpBuildOutDir();
  if (!existsSync(tmpDir)) {
    await io.mkdirP(tmpDir);
    core.info('TMP deployment folder ' + tmpDir);
  }

  // Ensure .tenderly directory exists
  const tenderlyDir = path.join(process.env.GITHUB_WORKSPACE || '', '.tenderly');
  if (!existsSync(tenderlyDir)) {
    await io.mkdirP(tenderlyDir);
    core.info('Created .tenderly folder');
  }

  core.info('Created deployments folder ' + deploymentsDir);
}

export async function storeInfrastructureInfo(networks: Record<string, NetworkInfo>): Promise<void> {
  try {
    const infraInfo: InfrastructureInfo = {
      networks: sanitizeInfraInfo(networks),
      timestamp: new Date().toISOString(),
      githubContext: {
        workflow: process.env.GITHUB_WORKFLOW || '',
        runId: process.env.GITHUB_RUN_ID || '',
        runNumber: process.env.GITHUB_RUN_NUMBER || '',
        job: process.env.GITHUB_JOB || '',
      },
    };

    const infraFile = infraFileForCurrentJob();
    await fs.writeFile(infraFile, JSON.stringify(infraInfo, null, 2));
    core.info(`Infrastructure information stored in ${infraFile}`);
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to store infrastructure information: ${err.message}`);
  }
}

function sanitizeInfraInfo(networks: Record<string, NetworkInfo>) {
  return Object.fromEntries(
    Object.entries(networks).map(([key, network]) => {
      const { adminRpcUrl, ...rest } = network;
      return [key, rest];
    }),
  ) as typeof networks;
}

export function currentJobFileBasename() {
  return sanitizeFileName(
    `${github.context.runNumber}-${github.context.workflow}-${github.context.job}`,
  );
}

export function infraFileForCurrentJob() {
  const jobFileName = currentJobFileBasename();
  return path.join(infraDir(), `${jobFileName}.json`);
}

export async function readInfraForCurrentJob(): Promise<InfrastructureInfo | null> {
  try {
    try {
      const content = await fs.readFile(infraFileForCurrentJob(), 'utf8');
      return JSON.parse(content) as InfrastructureInfo;
    } catch (error) {
      core.debug(`No infrastructure file found at ${infraFileForCurrentJob()}`);
      return null;
    }
  } catch (error) {
    const err = error as Error;
    core.warning(`Failed to read infrastructure file: ${err.message}`);
    return null;
  }
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/\//g, '-')    // Replace forward slashes with hyphens
    .replace(/\s+/g, '-')   // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9-]/g, '')  // Remove any characters that aren't alphanumeric or hyphens
    .toLowerCase();
}

export async function createInfraDir() {
  if (!existsSync(infraDir())) {
    await fs.mkdir(infraDir(), { recursive: true });
  }
}