// Runs the API and the web app together with labelled output: `npm run dev`.
// No dependencies — each app keeps its own node_modules and lockfile.
import { spawn } from 'node:child_process';

const apps = [
    { name: 'api', color: '\x1b[36m', args: ['--prefix', 'ShohozKitchen_Server', 'run', 'start:dev'] },
    { name: 'web', color: '\x1b[35m', args: ['--prefix', 'ShohozKitchen_Client', 'run', 'dev'] },
];

const children = apps.map(({ name, color, args }) => {
    const child = spawn('npm', args, { shell: process.platform === 'win32', env: process.env });
    const tag = `${color}[${name}]\x1b[0m `;
    const pipe = (stream, out) => {
        let buf = '';
        stream.on('data', (chunk) => {
            buf += chunk;
            const lines = buf.split(/\r?\n/);
            buf = lines.pop();
            for (const line of lines) out.write(tag + line + '\n');
        });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    child.on('exit', (code) => {
        console.log(`${tag}exited with code ${code}`);
        // If one app dies, stop the other so the terminal doesn't hang half-running.
        shutdown(code ?? 1);
    });
    return child;
});

let stopping = false;
function shutdown(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const c of children) {
        if (c.exitCode !== null) continue;
        // On Windows the child is a shell; kill the whole tree or the node servers linger.
        if (process.platform === 'win32') spawn('taskkill', ['/pid', String(c.pid), '/T', '/F']);
        else c.kill();
    }
    setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
