const { spawn, execSync } = require('child_process');
const path = require('path');

function runSync(cmd, cwd = '.') {
    console.log(`\n> Running: ${cmd} in ${cwd}`);
    execSync(cmd, { stdio: 'inherit', cwd });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function spawnBackground(cmd, args, cwd) {
    console.log(`\n> Spawning background: ${cmd} ${args.join(' ')} in ${cwd}`);
    const proc = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true });

    proc.stdout.on('data', (d) => process.stdout.write(`[${path.basename(cwd)}] ${d}`));
    proc.stderr.on('data', (d) => process.stderr.write(`[${path.basename(cwd)} ERR] ${d}`));

    return proc;
}

async function runValidation() {
    try {
        console.log('--- 1. Building Backend ---');
        runSync('npm run build', './apps/backend');

        console.log('\n--- 2. Building Frontend ---');
        runSync('npm run build', './apps/frontend');

        console.log('\n--- 3. Starting Servers for E2E ---');
        const backendProc = spawnBackground('npm', ['run', 'start'], './apps/backend');
        const frontendProc = spawnBackground('npm', ['run', 'start'], './apps/frontend');

        console.log('\nWaiting 10 seconds for servers to be ready...');
        await sleep(10000);

        console.log('\n--- 4. Running Cypress E2E Tests ---');
        // Run cypress headless
        try {
            runSync('npx cypress run', '.');
            console.log('\n✅ Cypress tests passed!');
        } catch (cypressError) {
            console.error('\n❌ Cypress tests failed!');
            throw cypressError;
        } finally {
            console.log('\n--- Cleaning up ---');
            backendProc.kill();
            frontendProc.kill();
            // on windows, hard kill children of npm wrappers if needed, but simple kill often works or fails silently
            try { execSync(`taskkill /pid ${backendProc.pid} /t /f`); } catch (e) { }
            try { execSync(`taskkill /pid ${frontendProc.pid} /t /f`); } catch (e) { }
        }

        console.log('\n✅ Complete system validation passed! Monorepo is stable.');
        process.exit(0);

    } catch (e) {
        console.error('\n❌ Setup/Validation failed!', e.message);
        process.exit(1);
    }
}

runValidation();
