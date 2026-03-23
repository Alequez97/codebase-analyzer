import { FileToolExecutor, FILE_TOOLS } from "./file-tools.js";
import { CommandToolExecutor, COMMAND_TOOLS } from "./command-tools.js";
import {
  DelegationToolExecutor,
  DELEGATION_TOOLS,
} from "./delegation-tools.js";
import { WebSearchToolExecutor, WEB_SEARCH_TOOLS } from "./web-search-tools.js";
import { WebFetchToolExecutor, WEB_FETCH_TOOLS } from "./web-fetch-tools.js";
import { MessageToolExecutor, MESSAGE_TOOLS } from "./message-tools.js";

export {
  FileToolExecutor,
  CommandToolExecutor,
  DelegationToolExecutor,
  WebSearchToolExecutor,
  WebFetchToolExecutor,
  MessageToolExecutor,
};

/**
 * Manages all tool executors for an agent session.
 * Provides tool routing and availability — keeps tool logic out of the agent.
 */
export class ToolRegistry {
  constructor(workingDirectory) {
    this._workingDirectory = workingDirectory;
    this.fileToolExecutor = new FileToolExecutor(workingDirectory);
    this.commandToolExecutor = null;
    this.delegationToolExecutor = null;
    this.webSearchToolExecutor = null;
    this.webFetchToolExecutor = null;
    this.messageToolExecutor = null;
  }

  enableCommandTools(options = {}) {
    this.commandToolExecutor = new CommandToolExecutor(
      this._workingDirectory,
      options,
    );
  }

  // Git commands
  enableGitCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableGitCommands();
  }

  // NPM commands
  enableNpmInstallCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableNpmInstallCommands();
  }

  enableNpmBuildCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableNpmBuildCommands();
  }

  enableNpmTestCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableNpmTestCommands();
  }

  // Package manager shortcuts
  enableAllNpmCommands() {
    this.enableNpmInstallCommands();
    this.enableNpmBuildCommands();
    this.enableNpmTestCommands();
  }

  enableYarnCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableYarnCommands();
  }

  enablePnpmCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enablePnpmCommands();
  }

  // Language-specific test commands
  enablePythonCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enablePythonCommands();
  }

  enableGoCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableGoCommands();
  }

  enableRustCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableRustCommands();
  }

  enableDotnetCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableDotnetCommands();
  }

  enableJavaCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableJavaCommands();
  }

  enableRubyCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enableRubyCommands();
  }

  enablePhpCommands() {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.enablePhpCommands();
  }

  setCommandTimeout(timeoutMs) {
    if (!this.commandToolExecutor) {
      this.enableCommandTools();
    }
    this.commandToolExecutor.setTimeout(timeoutMs);
  }

  enableDelegationTools(parentTaskId, queueFunctions) {
    this.delegationToolExecutor = new DelegationToolExecutor(
      this._workingDirectory,
      parentTaskId,
      queueFunctions,
    );
  }

  enableWebSearchTools(apiKey) {
    this.webSearchToolExecutor = new WebSearchToolExecutor(apiKey);
  }

  enableWebFetchTools() {
    this.webFetchToolExecutor = new WebFetchToolExecutor();
  }

  enableMessageTools(responseHandler) {
    this.messageToolExecutor = new MessageToolExecutor(responseHandler);
  }

  findExecutor(toolName) {
    const entries = [
      {
        executor: this.delegationToolExecutor,
        tools: DELEGATION_TOOLS,
        stringifyResult: true,
      },
      {
        executor: this.messageToolExecutor,
        tools: MESSAGE_TOOLS,
        stringifyResult: false,
      },
      {
        executor: this.commandToolExecutor,
        tools: COMMAND_TOOLS,
        stringifyResult: false,
      },
      {
        executor: this.webSearchToolExecutor,
        tools: WEB_SEARCH_TOOLS,
        stringifyResult: false,
      },
      {
        executor: this.webFetchToolExecutor,
        tools: WEB_FETCH_TOOLS,
        stringifyResult: false,
      },
      {
        executor: this.fileToolExecutor,
        tools: FILE_TOOLS,
        stringifyResult: false,
      },
    ];

    return entries.find(
      ({ executor, tools }) =>
        executor && tools.some((t) => t.name === toolName),
    );
  }

  getAvailableTools() {
    const tools = [...FILE_TOOLS];
    if (this.commandToolExecutor) tools.push(...COMMAND_TOOLS);
    if (this.delegationToolExecutor) tools.push(...DELEGATION_TOOLS);
    if (this.webSearchToolExecutor) tools.push(...WEB_SEARCH_TOOLS);
    if (this.messageToolExecutor) tools.push(...MESSAGE_TOOLS);
    if (this.webFetchToolExecutor) tools.push(...WEB_FETCH_TOOLS);
    return tools;
  }
}
