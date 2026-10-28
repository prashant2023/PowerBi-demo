import { spawn } from 'node:child_process';

const processes = [
  ['API', ['run', 'dev', '--workspace', 'server']],
  ['UI', ['run', 'dev', '--workspace', 'client']]
];

const active = processes.map(([name, args]) => {
  const process = spawn('npm', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  process.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`${name} exited with code ${code}`);
  });
  return process;
});

const cleanup = () => active.forEach((process) => process.kill('SIGTERM'));
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
