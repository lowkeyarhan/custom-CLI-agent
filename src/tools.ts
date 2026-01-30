import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { Tool, ToolResult } from './types.js';

const execAsync = promisify(exec);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const tools: Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. Warns if file is larger than 1MB.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read (relative or absolute)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file with the given content. Creates directories if needed.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write (relative or absolute)'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'List files and directories in a given path. Can recursively list subdirectories.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list (relative or absolute)'
        },
        recursive: {
          type: 'string',
          description: 'Whether to list recursively',
          enum: ['true', 'false']
        },
        depth: {
          type: 'string',
          description: 'Maximum depth for recursive listing (default: 2)'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'run_command',
    description: 'Execute a shell command. Use this to run npm install, git commands, tests, etc.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command (optional)'
        }
      },
      required: ['command']
    }
  }
];

export async function readFile(filePath: string): Promise<ToolResult> {
  try {
    const stats = await fs.stat(filePath);
    
    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        output: '',
        error: `Warning: File size is ${(stats.size / 1024 / 1024).toFixed(2)}MB, which exceeds 1MB. Consider reading a smaller file.`
      };
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return {
      success: true,
      output: content
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function writeFile(filePath: string, content: string): Promise<ToolResult> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      success: true,
      output: `Successfully wrote to ${filePath}`
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function listFiles(
  dirPath: string,
  recursive: boolean = false,
  maxDepth: number = 2,
  currentDepth: number = 0
): Promise<ToolResult> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let output = '';

    for (const entry of entries) {
      const indent = '  '.repeat(currentDepth);
      const prefix = entry.isDirectory() ? '📁' : '📄';
      output += `${indent}${prefix} ${entry.name}\n`;

      if (recursive && entry.isDirectory() && currentDepth < maxDepth) {
        const subPath = path.join(dirPath, entry.name);
        const subResult = await listFiles(subPath, true, maxDepth, currentDepth + 1);
        if (subResult.success) {
          output += subResult.output;
        }
      }
    }

    return {
      success: true,
      output: output || 'Empty directory'
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function runCommand(command: string, cwd?: string): Promise<ToolResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    return {
      success: true,
      output: stdout || stderr || 'Command executed successfully (no output)'
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message || 'Command execution failed'
    };
  }
}

export async function executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
  switch (name) {
    case 'read_file':
      return readFile(args.path);
    
    case 'write_file':
      return writeFile(args.path, args.content);
    
    case 'list_files':
      return listFiles(
        args.path,
        args.recursive === 'true',
        args.depth ? parseInt(args.depth, 10) : 2
      );
    
    case 'run_command':
      return runCommand(args.command, args.cwd);
    
    default:
      return {
        success: false,
        output: '',
        error: `Unknown tool: ${name}`
      };
  }
}
