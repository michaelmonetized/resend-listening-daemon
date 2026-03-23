/**
 * Email Instruction Executor
 *
 * Parses email body for commands and executes them
 * Examples: "commit and push resend-listening-daemon", "deploy citation-manager"
 */

import { execSync } from "child_process";

interface ExecutionResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
}

// Trusted senders who can execute commands
const TRUSTED_SENDERS = [
  "michael@uncap.us",
  "michaelmonetized@gmail.com",
  "michael@hurleyus.com",
];

// Command patterns and their handlers
const COMMANDS = {
  "commit and push": {
    pattern: /commit and push\s+(\w[\w\-]*)/i,
    handler: commitAndPush,
    description: "Commit all changes and push to GitHub",
  },
  deploy: {
    pattern: /deploy\s+(\w[\w\-]*)/i,
    handler: deploy,
    description: "Deploy a project to production",
  },
  "run tests": {
    pattern: /run tests?\s+(?:for\s+)?(\w[\w\-]*)?/i,
    handler: runTests,
    description: "Run test suite",
  },
  "build project": {
    pattern: /build\s+(\w[\w\-]*)/i,
    handler: buildProject,
    description: "Build a project",
  },
};

/**
 * Check if sender is trusted
 */
function isTrustedSender(email: string): boolean {
  return TRUSTED_SENDERS.includes(email);
}

/**
 * Parse email body for instructions
 */
export function parseInstructions(
  emailBody: string
): Array<{ command: string; project?: string }> {
  const instructions: Array<{ command: string; project?: string }> = [];

  for (const [name, cmd] of Object.entries(COMMANDS)) {
    const match = emailBody.match(cmd.pattern);
    if (match) {
      instructions.push({
        command: name,
        project: match[1] || undefined,
      });
    }
  }

  return instructions;
}

/**
 * Execute a command
 */
async function commitAndPush(project?: string): Promise<ExecutionResult> {
  try {
    if (!project) {
      return {
        success: false,
        command: "commit and push",
        output: "",
        error: "Project name required (e.g., 'commit and push resend-listening-daemon')",
      };
    }

    const projectPath = `~/Projects/${project}`;
    const cmd = `cd ${projectPath} && git add -A && git commit -m "automated: changes from email instruction" && git push origin $(git rev-parse --abbrev-ref HEAD)`;

    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    return {
      success: true,
      command: `commit and push ${project}`,
      output: output.trim().slice(-200), // Last 200 chars
    };
  } catch (err: any) {
    return {
      success: false,
      command: `commit and push ${project}`,
      output: "",
      error: err.message || String(err),
    };
  }
}

/**
 * Deploy a project
 */
async function deploy(project?: string): Promise<ExecutionResult> {
  try {
    if (!project) {
      return {
        success: false,
        command: "deploy",
        output: "",
        error: "Project name required",
      };
    }

    const projectPath = `~/Projects/${project}`;
    // Check for vercel.json or package.json with deploy script
    const cmd = `cd ${projectPath} && vercel --prod --yes`;

    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 30000,
    });

    return {
      success: true,
      command: `deploy ${project}`,
      output: output.trim().slice(-200),
    };
  } catch (err: any) {
    return {
      success: false,
      command: `deploy ${project}`,
      output: "",
      error: err.message || String(err),
    };
  }
}

/**
 * Run tests
 */
async function runTests(project?: string): Promise<ExecutionResult> {
  try {
    const projectPath = project ? `~/Projects/${project}` : ".";
    const cmd = `cd ${projectPath} && bun test`;

    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 60000,
    });

    return {
      success: true,
      command: `run tests ${project || "current"}`,
      output: output.trim().slice(-200),
    };
  } catch (err: any) {
    return {
      success: false,
      command: `run tests ${project || "current"}`,
      output: "",
      error: err.message || String(err),
    };
  }
}

/**
 * Build a project
 */
async function buildProject(project?: string): Promise<ExecutionResult> {
  try {
    if (!project) {
      return {
        success: false,
        command: "build",
        output: "",
        error: "Project name required",
      };
    }

    const projectPath = `~/Projects/${project}`;
    const cmd = `cd ${projectPath} && bun run build`;

    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 60000,
    });

    return {
      success: true,
      command: `build ${project}`,
      output: output.trim().slice(-200),
    };
  } catch (err: any) {
    return {
      success: false,
      command: `build ${project}`,
      output: "",
      error: err.message || String(err),
    };
  }
}

/**
 * Execute an instruction
 */
export async function executeInstruction(
  instruction: { command: string; project?: string },
  senderEmail: string
): Promise<ExecutionResult> {
  // Check if sender is trusted
  if (!isTrustedSender(senderEmail)) {
    return {
      success: false,
      command: instruction.command,
      output: "",
      error: `Sender not trusted: ${senderEmail}`,
    };
  }

  const cmd = COMMANDS[instruction.command as keyof typeof COMMANDS];
  if (!cmd) {
    return {
      success: false,
      command: instruction.command,
      output: "",
      error: `Unknown command: ${instruction.command}`,
    };
  }

  return cmd.handler(instruction.project);
}

/**
 * Format execution result for display
 */
export function formatResult(result: ExecutionResult): string {
  if (result.success) {
    return `✅ ${result.command}\n${result.output}`;
  } else {
    return `❌ ${result.command}\n${result.error}`;
  }
}
