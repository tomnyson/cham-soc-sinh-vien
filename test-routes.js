const http = require('http');

const routes = [
    '/',
    '/grade-check',
    '/profiles',
    '/classes',
    '/template'
];

async function testRoute(route) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: route,
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    route,
                    status: res.statusCode,
                    success: res.statusCode === 200 || res.statusCode === 302
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                route,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                route,
                status: 'TIMEOUT',
                success: false
            });
        });

        req.end();
    });
}

async function testAllRoutes() {
    console.log('🧪 Testing Routes...\n');
    
    for (const route of routes) {
        const result = await testRoute(route);
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${result.route} - Status: ${result.status}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }
    
    console.log('\n✅ Test complete!');
}

// Check if server is running
console.log('Checking if server is running on http://localhost:3000...\n');
testAllRoutes();
