
// stockfish/engine.ts
'use client';

type EngineMessage = {
  bestMove?: string;
  evaluation?: number;
  depth?: number;
  pv?: string[];
  mate?: number;
};

type MessageHandler = (message: EngineMessage) => void;

class Engine {
  private worker: Worker | null = null;
  private messageHandlers: MessageHandler[] = [];
  private ready = false;
  private initialized = false;
  private evaluating = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.worker = new Worker('/stockfish-nnue-16.js');
        this.init();
      } catch (e) {
        console.error('Failed to load Stockfish engine:', e);
      }
    }
  }

  private init(): void {
    if (!this.worker || this.initialized) return;
    
    this.initialized = true;
    
    this.worker.onmessage = (e) => {
      const line = e.data;
      console.log('Stockfish output:', line); // Add logging to debug
      
      // Handle "readyok" message
      if (line === 'readyok') {
        this.ready = true;
        return;
      }
      
      // Parse evaluation info
      if (line.startsWith('info')) {
        const message: EngineMessage = {};
        
        // Extract depth
        const depthMatch = line.match(/depth (\d+)/);
        if (depthMatch) {
          message.depth = parseInt(depthMatch[1]);
        }
        
        // Extract score
        const scoreMatch = line.match(/score cp (-?\d+)/);
        if (scoreMatch) {
          message.evaluation = parseInt(scoreMatch[1]) / 100;
        }
        
        // Extract mate
        const mateMatch = line.match(/score mate (-?\d+)/);
        if (mateMatch) {
          message.mate = parseInt(mateMatch[1]);
        }
        
        // Extract PV (principal variation)
        const pvMatch = line.match(/pv (.+?)(?= bmc| tbhits| $)/);
        if (pvMatch) {
          message.pv = pvMatch[1].split(' ');
        }
        
        // Only notify handlers if we have meaningful analysis
        if (message.depth && (message.evaluation !== undefined || message.mate !== undefined)) {
          this.notifyHandlers(message);
        }
      }
      
      // Handle bestmove response
      if (line.startsWith('bestmove')) {
        console.log('Received bestmove response:', line);
        const bestMoveMatch = line.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (bestMoveMatch) {
          this.evaluating = false;
          this.notifyHandlers({ bestMove: bestMoveMatch[1] });
        } else {
          // Handle case where bestmove is (none) or another special value
          this.evaluating = false;
          this.notifyHandlers({ bestMove: '' });
        }
      }
    };
    
    this.worker.onerror = (e) => {
        console.error('Stockfish worker error:', e);
        this.ready = true;
        this.evaluating = false;
    };
    this.sendCommand('uci');
    this.sendCommand('isready');
    this.sendCommand('setoption name Threads value 4');
    this.sendCommand('setoption name Hash value 32');
    this.sendCommand('setoption name Skill Level value 20');
    this.sendCommand('setoption name UCI_AnalyseMode value false'); //
  }

  private sendCommand(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private waitForReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    
    return new Promise((resolve) => {
      const checkReady = setInterval(() => {
        if (this.ready) {
          clearInterval(checkReady);
          resolve();
        }
      }, 50);
    });
  }

  public setDifficulty(level: number): void {
    // Skill level 0-20, where 20 is strongest
    const skillLevel = Math.max(0, Math.min(20, level));
    this.sendCommand(`setoption name Skill Level value ${skillLevel}`);
  }

  public async evaluatePosition(fen: string, depth: number = 15): Promise<void> {
    if (!this.worker) return;
    
    if (this.evaluating) {
      this.sendCommand('stop');
      // Wait a bit to ensure the engine has time to process the stop command
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await this.waitForReady();
    
    this.evaluating = true;
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);
  }

  public async getBestMove(fen: string, timeMs: number = 1000): Promise<string> {
    if (!this.worker) return '';
    
    if (this.evaluating) {
      this.sendCommand('stop');
      // Wait a bit to ensure the engine has time to process the stop command
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    await this.waitForReady();
    
    return new Promise((resolve) => {
      // Safety timeout in case engine doesn't respond
      const timeoutId = setTimeout(() => {
        console.warn('Stockfish timeout - forcing move');
        this.sendCommand('stop');
        resolve('');  // Return empty string to indicate timeout
      }, timeMs + 2000); // Give a 2-second grace period beyond requested time
      
      this.onMessage(({ bestMove }) => {
        if (bestMove) {
          clearTimeout(timeoutId);
          resolve(bestMove);
          this.clearHandlers();
        }
      });
      
      this.evaluating = true;
      this.sendCommand(`position fen ${fen}`);
      // this.sendCommand(`go movetime ${timeMs}`);
      this.sendCommand(`go depth 20`);
    });
  }

  public onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  public clearHandlers(): void {
    this.messageHandlers = [];
  }

  private notifyHandlers(message: EngineMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.ready = false;
      this.evaluating = false;
    }
  }
}

export default Engine;
