const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// --- Configuration ---
const SERVER_IP = process.env.DEPLOY_HOST || '115.190.153.44';
const SERVER_PORT = process.env.DEPLOY_PORT || '3070';
const SERVER_DOMAIN = process.env.DEPLOY_DOMAIN || 'tp.xuanjian.top';
const DEPLOY_PATH = process.env.DEPLOY_PATH || '/opt/easyballot';
const SSH_USER = process.env.DEPLOY_USER || 'root';

// Read SSH user from args if provided
const args = process.argv.slice(2);
const userArg = args.find(a => a.startsWith('--user='));
const finalUser = userArg ? userArg.split('=')[1] : SSH_USER;

// --- Helpers ---
function log(msg) {
  console.log(`[deploy] ${msg}`);
}

function execWithOutput(cmd, options) {
  return execSync(cmd, { stdio: 'inherit', ...options });
}

function execQuiet(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// --- Main ---
async function main() {
  log('=== EasyBallot Deployment ===');
  log(`Target: ${finalUser}@${SERVER_IP}:${DEPLOY_PATH}`);

  // Step 1: Build client
  log('Step 1/6: Building client...');
  execWithOutput('npm run build:client', { cwd: __dirname });

  // Step 2: Build server
  log('Step 2/6: Building server...');
  execWithOutput('npm run build:server', { cwd: __dirname });

  // Step 3: Create temp deploy directory
  log('Step 3/6: Preparing deploy package...');
  const deployDir = path.join(os.tmpdir(), 'easyballot-deploy-' + Date.now());
  const packageDir = path.join(deployDir, 'deploy_package');
  const serverDest = path.join(packageDir, 'server');
  const clientDest = path.join(packageDir, 'client');

  fs.mkdirSync(serverDest, { recursive: true });
  fs.mkdirSync(clientDest, { recursive: true });

  // Copy server files
  const serverSrc = path.join(__dirname, 'server');
  copyDir(path.join(serverSrc, 'dist'), path.join(serverDest, 'dist'));
  copyFileIfExists(path.join(serverSrc, 'package.json'), path.join(serverDest, 'package.json'));
  copyFileIfExists(path.join(serverSrc, 'package-lock.json'), path.join(serverDest, 'package-lock.json'));

  // Copy PM2 ecosystem config
  copyFileIfExists(
    path.join(serverSrc, 'ecosystem.config.js'),
    path.join(serverDest, 'ecosystem.config.js')
  );

  // Copy client dist
  copyDir(path.join(__dirname, 'client', 'dist'), path.join(clientDest, 'dist'));

  // Copy .env file
  const envSrc = path.join(__dirname, '.env');
  if (fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, path.join(packageDir, '.env'));
    log('  Copied .env file');
  } else {
    log('  WARNING: No .env file found! Create one from .env.template before first deploy.');
  }

  // Copy PM2 ecosystem config to package root as well
  const ecosystemSrc = path.join(__dirname, 'server', 'ecosystem.config.js');
  if (fs.existsSync(ecosystemSrc)) {
    fs.copyFileSync(ecosystemSrc, path.join(packageDir, 'ecosystem.config.js'));
  }

  // Step 4: Upload via SCP
  log('Step 4/6: Uploading to server...');
  const sshTarget = `${finalUser}@${SERVER_IP}:${DEPLOY_PATH}`;

  // Ensure target directory exists
  try {
    execQuiet(`ssh ${finalUser}@${SERVER_IP} "mkdir -p ${DEPLOY_PATH}"`);
  } catch {
    log('  WARNING: Could not create remote directory. It may already exist or SSH may require password.');
  }

  execWithOutput(`scp -r "${packageDir}/." ${sshTarget}/`);

  // Step 5: Remote install and restart
  log('Step 5/6: Installing dependencies on server...');
  const remoteCommands = [
    `cd ${DEPLOY_PATH}/server`,
    'npm install --production',
    'cd ..',
    'cp -f .env server/.env 2>/dev/null || echo "  Note: .env not copied, ensure it exists in server/"',
    `cd ${DEPLOY_PATH}/server`,
    'pm2 restart easyballot || pm2 start ecosystem.config.js',
    'pm2 save'
  ].join(' && ');

  execWithOutput(`ssh ${finalUser}@${SERVER_IP} "${remoteCommands}"`);

  // Step 6: Cleanup
  log('Step 6/6: Cleaning up...');
  fs.rmSync(deployDir, { recursive: true, force: true });

  log('=== Deployment complete! ===');
  log(`Server: http://${SERVER_DOMAIN}`);
  log(`Admin: http://${SERVER_DOMAIN}/admin`);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    log(`  WARNING: Source not found: ${src}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true });
  log(`  Copied: ${src} -> ${dest}`);
}

function copyFileIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    log(`  Copied: ${src} -> ${dest}`);
  } else {
    log(`  WARNING: File not found: ${src}`);
  }
}

main().catch(err => {
  console.error('[deploy] Error:', err.message);
  process.exit(1);
});
