import fs from 'fs/promises';
import path from 'path';
import type { ConversationHistory, Message } from './types.js';

export class HistoryManager {
  private conversationFile: string;
  private messages: Message[] = [];

  constructor(conversationFile: string) {
    this.conversationFile = conversationFile;
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.conversationFile, 'utf-8');
      const history: ConversationHistory = JSON.parse(content);
      this.messages = history.messages || [];
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      this.messages = [];
    }
  }

  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.conversationFile);
      await fs.mkdir(dir, { recursive: true });
      
      const history: ConversationHistory = {
        messages: this.messages,
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(
        this.conversationFile,
        JSON.stringify(history, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return this.messages;
  }

  clear(): void {
    this.messages = [];
  }

  async clearFile(): Promise<void> {
    this.clear();
    try {
      await fs.unlink(this.conversationFile);
    } catch (error) {
      // File doesn't exist, ignore
    }
  }
}
