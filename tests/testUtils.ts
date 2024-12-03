import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'; 
import { ChildProcess, spawn } from 'child_process';


export const startMoto = async (): Promise<ChildProcess> => {
    const moto = spawn('moto_server', ['-p', '5000'], { detached: true, stdio: 'ignore' });
    // Wait until moto is running.
    const client = new STSClient({ endpoint: 'http://127.0.0.1:5000' });
    const input = {};
    const command = new GetCallerIdentityCommand(input);
    while (true) {
      try {
        await client.send(command);
        return moto;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait before retrying
      }
    }
  };
  
  export const stopMoto = (moto: ChildProcess) => {
    moto.kill();
  };