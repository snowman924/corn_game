const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

global.describe = function(name, fn) {
    console.log(`\n\x1b[35m=== ${name} ===\x1b[0m`);
    fn();
};

global.it = function(desc, fn) {
    try {
        fn();
        console.log(`  \x1b[32m✓\x1b[0m ${desc}`);
        testsPassed++;
    } catch (err) {
        console.error(`  \x1b[31m✗ ${desc}\x1b[0m`);
        console.error(`    -> ${err.message || err}`);
        testsFailed++;
    }
};

global.assert = {
    ok: (val, msg) => { if (!val) throw new Error(msg || 'Expected truthy'); },
    equal: (a, b, msg) => { if (a !== b) throw new Error(msg || `Expected ${a} to equal ${b}`); },
    near: (a, b, margin = 0.001, msg) => { if (Math.abs(a - b) > margin) throw new Error(msg || `Expected ${a} to be near ${b}`); }
};

// test 폴더 안의 모든 .test.js 파일을 로드하여 실행
const testDir = __dirname;
fs.readdirSync(testDir).forEach(file => {
    if (file.endsWith('.test.js') && file !== 'runTests.js') {
        require(path.join(testDir, file));
    }
});

console.log(`\n\x1b[36m=============================\x1b[0m`);
console.log(`\x1b[32mPassed: ${testsPassed}\x1b[0m | \x1b[31mFailed: ${testsFailed}\x1b[0m`);
console.log(`\x1b[36m=============================\x1b[0m`);

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
