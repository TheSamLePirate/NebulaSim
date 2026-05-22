
// verify_proxy.js
import { spawn } from 'child_process';
import fetch from 'node-fetch'; // assuming node 18+ or installed, but for script I can use built-in fetch if node version allows.
// Actually, since the project has package.json with "type": "module", I can use native fetch if node is modern. 
// If not, I'll use standard http. But let's assume native fetch for now as it's common on Macs.

const PORT = 3009;
const GOVEE_PORT = 3000;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
    console.log(`Starting server.js on port ${PORT}...`);
    const server = spawn('node', ['server.js'], {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: { ...process.env, PORT: PORT.toString() }
    });

    server.stdout.on('data', (data) => {
        console.log(`SERVER STDOUT: ${data}`);
    });

    server.stderr.on('data', (data) => {
        console.error(`SERVER STDERR: ${data}`);
    });

    return server;
}

async function testEndpoint(endpoint, method = "GET", body = null) {
    console.log(`\nTesting ${method} /api/${endpoint}...`);
    try {
        const options = { method };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }

        const res = await fetch(`https://localhost:${PORT}/api/${endpoint}`, options);
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 200)}...`); // truncate

        if (res.status === 200) {
            console.log("✅ Passed (assuming 200 OK means upstream replied)");
        } else if (res.status === 500) {
            console.log("⚠️ 500 Error - Likely upstream (port 3000) is down, but proxy logic was hit.");
        } else {
            console.log(`⚠️ Received ${res.status}`);
        }

    } catch (e) {
        console.error("❌ Request Failed:", e.message);
    }
}

async function main() {
    let serverProcess;
    try {
        //serverProcess = await startServer();
        //await sleep(3000); // Wait for server to start

        //await testEndpoint("devices");
        //await testEndpoint("color", "POST", { hex: "#FF0000" });
        await testEndpoint("brightness", "POST", { brightness: 100 });

    } catch (e) {
        console.error("Execution failed:", e);
    } finally {
        if (serverProcess) {
            console.log("\nKilling server process...");
            serverProcess.kill();
        }
    }
}

main();
