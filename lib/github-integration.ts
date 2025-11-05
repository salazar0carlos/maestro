/**
 * GitHub API Integration for Maestro
 * Enables agents to create branches, commit files, and manage pull requests
 *
 * Security:
 * - Token stored in environment variables
 * - Never logs tokens
 * - Rate limit handling (5000 requests/hour)
 * - Retry logic with exponential backoff
 */

export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

export interface GitHubRef {
  ref: string;
  sha: string;
}

export interface GitHubFile {
  sha: string;
  content: string;
  path: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  url: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
}

export interface RateLimitInfo {
  remaining: number;
  reset: Date;
  limit: number;
}

export class GitHubIntegration {
  private owner: string;
  private repo: string;
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
  }

  /**
   * Create from environment variables
   */
  static fromEnv(): GitHubIntegration | null {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
      console.error('Missing GitHub configuration in environment variables');
      return null;
    }

    return new GitHubIntegration({ owner, repo, token });
  }

  /**
   * Make authenticated request to GitHub API with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, { ...options, headers });

        // Handle rate limiting
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const waitTime = resetTime
            ? (parseInt(resetTime) * 1000 - Date.now())
            : 60000;

          console.warn(`Rate limited. Waiting ${waitTime}ms`);
          await this.sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            `GitHub API error: ${response.status} - ${error.message || response.statusText}`
          );
        }

        return await response.json() as T;
      } catch (error) {
        if (attempt === retries) throw error;

        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Request failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get reference (branch/tag) information
   */
  async getRef(branch: string): Promise<GitHubRef> {
    const ref = branch.startsWith('refs/') ? branch : `refs/heads/${branch}`;
    const data = await this.request<{ ref: string; object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/${ref}`
    );

    return {
      ref: data.ref,
      sha: data.object.sha,
    };
  }

  /**
   * Create new reference (branch)
   */
  async createRef(ref: string, sha: string): Promise<GitHubRef> {
    const data = await this.request<{ ref: string; object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/refs`,
      {
        method: 'POST',
        body: JSON.stringify({ ref, sha }),
      }
    );

    return {
      ref: data.ref,
      sha: data.object.sha,
    };
  }

  /**
   * Create new branch from existing branch
   */
  async createBranch(branchName: string, fromBranch = 'main'): Promise<GitHubRef> {
    try {
      const sourceRef = await this.getRef(fromBranch);
      const newRef = `refs/heads/${branchName}`;
      return await this.createRef(newRef, sourceRef.sha);
    } catch (error) {
      throw new Error(`Failed to create branch ${branchName}: ${error}`);
    }
  }

  /**
   * Get file from repository
   */
  async getFile(filePath: string, branch = 'main'): Promise<GitHubFile> {
    const data = await this.request<{ sha: string; content: string; path: string }>(
      `/repos/${this.owner}/${this.repo}/contents/${filePath}?ref=${branch}`
    );

    return {
      sha: data.sha,
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      path: data.path,
    };
  }

  /**
   * Create new file in repository
   */
  async createFile(
    filePath: string,
    content: string,
    message: string,
    branch = 'main'
  ): Promise<GitHubCommit> {
    const encodedContent = Buffer.from(content).toString('base64');

    const data = await this.request<{ commit: { sha: string; message: string; html_url: string } }>(
      `/repos/${this.owner}/${this.repo}/contents/${filePath}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encodedContent,
          branch,
        }),
      }
    );

    return {
      sha: data.commit.sha,
      message: data.commit.message,
      url: data.commit.html_url,
    };
  }

  /**
   * Update existing file in repository
   */
  async updateFile(
    filePath: string,
    content: string,
    message: string,
    sha: string,
    branch = 'main'
  ): Promise<GitHubCommit> {
    const encodedContent = Buffer.from(content).toString('base64');

    const data = await this.request<{ commit: { sha: string; message: string; html_url: string } }>(
      `/repos/${this.owner}/${this.repo}/contents/${filePath}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          message,
          content: encodedContent,
          sha,
          branch,
        }),
      }
    );

    return {
      sha: data.commit.sha,
      message: data.commit.message,
      url: data.commit.html_url,
    };
  }

  /**
   * Commit file (create or update)
   */
  async commitFile(
    branch: string,
    filePath: string,
    content: string,
    message: string
  ): Promise<GitHubCommit> {
    try {
      // Try to get existing file
      const file = await this.getFile(filePath, branch);

      // Update existing file
      return await this.updateFile(filePath, content, message, file.sha, branch);
    } catch (error) {
      // File doesn't exist, create new file
      return await this.createFile(filePath, content, message, branch);
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest(
    branch: string,
    title: string,
    description: string,
    baseBranch = 'main'
  ): Promise<GitHubPullRequest> {
    const data = await this.request<{
      number: number;
      title: string;
      html_url: string;
      state: 'open' | 'closed';
    }>(
      `/repos/${this.owner}/${this.repo}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          body: description,
          head: branch,
          base: baseBranch,
        }),
      }
    );

    return {
      number: data.number,
      title: data.title,
      url: data.html_url,
      state: data.state,
    };
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    prNumber: number,
    commitMessage?: string
  ): Promise<{ merged: boolean; message: string }> {
    const data = await this.request<{ merged: boolean; message: string }>(
      `/repos/${this.owner}/${this.repo}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        body: JSON.stringify({
          commit_message: commitMessage,
          merge_method: 'squash',
        }),
      }
    );

    return {
      merged: data.merged,
      message: data.message,
    };
  }

  /**
   * Get pull request status
   */
  async getPullRequest(prNumber: number): Promise<GitHubPullRequest> {
    const data = await this.request<{
      number: number;
      title: string;
      html_url: string;
      state: 'open' | 'closed';
      merged: boolean;
    }>(
      `/repos/${this.owner}/${this.repo}/pulls/${prNumber}`
    );

    return {
      number: data.number,
      title: data.title,
      url: data.html_url,
      state: data.merged ? 'merged' : data.state,
    };
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<RateLimitInfo> {
    const data = await this.request<{
      rate: {
        remaining: number;
        reset: number;
        limit: number;
      };
    }>('/rate_limit');

    return {
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
      limit: data.rate.limit,
    };
  }

  /**
   * Check if branch exists
   */
  async branchExists(branch: string): Promise<boolean> {
    try {
      await this.getRef(branch);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete branch
   */
  async deleteBranch(branch: string): Promise<void> {
    const ref = `refs/heads/${branch}`;
    await this.request(
      `/repos/${this.owner}/${this.repo}/git/${ref}`,
      { method: 'DELETE' }
    );
  }
}
