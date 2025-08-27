#!/usr/bin/env node

/**
 * 전체 차트 자동화 프로세스를 순차적으로 실행하는 스크립트
 */

const { spawn } = require('child_process');
const path = require('path');

// 환경변수 로드
require('dotenv').config();

/**
 * 스크립트 실행 함수
 */
function runScript(scriptPath, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🚀 Starting: ${description}`);
        console.log(`📄 Script: ${scriptPath}`);
        console.log('─'.repeat(50));
        
        const child = spawn('node', [scriptPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Completed: ${description}`);
                resolve();
            } else {
                console.error(`❌ Failed: ${description} (exit code: ${code})`);
                reject(new Error(`Script failed with exit code ${code}`));
            }
        });
        
        child.on('error', (error) => {
            console.error(`❌ Error running ${description}:`, error);
            reject(error);
        });
    });
}

/**
 * 메인 실행 함수
 */
async function main() {
    const startTime = Date.now();
    
    console.log('🎵 CHART FINDER AUTOMATION');
    console.log('═'.repeat(50));
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    console.log(`🔧 Node.js: ${process.version}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log('═'.repeat(50));
    
    try {
        // 1. kworb 차트 스크래핑
        await runScript(
            './scripts/scrape-kworb.js',
            'Scraping kworb chart data'
        );
        
        // 2. Manus Agent를 통한 TIDAL 크레딧 수집
        await runScript(
            './scripts/trigger-manus-agent.js',
            'Collecting TIDAL credits via Manus Agent'
        );
        
        // 3. YouTube 링크 수집
        await runScript(
            './scripts/get-youtube-links.js',
            'Collecting YouTube video links'
        );
        
        // 4. HTML 생성
        await runScript(
            './scripts/generate-html.js',
            'Generating HTML page'
        );
        
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('\n🎉 ALL PROCESSES COMPLETED SUCCESSFULLY!');
        console.log('═'.repeat(50));
        console.log(`⏱️  Total duration: ${duration} seconds`);
        console.log(`📅 Completed at: ${new Date().toISOString()}`);
        console.log(`🌐 Output directory: ./dist/`);
        console.log(`📄 Main file: ./dist/index.html`);
        console.log('═'.repeat(50));
        
        // 성공 통계
        console.log('\n📊 PROCESS SUMMARY:');
        console.log('✅ Chart data scraped from kworb.net');
        console.log('✅ TIDAL credits collected via Manus Agent');
        console.log('✅ YouTube video links gathered');
        console.log('✅ HTML page generated');
        console.log('\n🚀 Ready for deployment!');
        
    } catch (error) {
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.error('\n💥 PROCESS FAILED!');
        console.error('═'.repeat(50));
        console.error(`❌ Error: ${error.message}`);
        console.error(`⏱️  Failed after: ${duration} seconds`);
        console.error(`📅 Failed at: ${new Date().toISOString()}`);
        console.error('═'.repeat(50));
        
        console.error('\n🔍 TROUBLESHOOTING TIPS:');
        console.error('1. Check your environment variables (.env file)');
        console.error('2. Ensure all API keys are valid');
        console.error('3. Check network connectivity');
        console.error('4. Review the error logs above');
        console.error('5. Try running individual scripts manually');
        
        process.exit(1);
    }
}

// 프로세스 종료 시그널 처리
process.on('SIGINT', () => {
    console.log('\n⚠️  Process interrupted by user');
    console.log('🛑 Cleaning up and exiting...');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Process terminated');
    console.log('🛑 Cleaning up and exiting...');
    process.exit(1);
});

// 처리되지 않은 예외 처리
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    runScript,
    main
};

