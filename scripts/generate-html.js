#!/usr/bin/env node

/**
 * 수집된 데이터를 사용하여 레트로 터미널 스타일의 HTML 페이지를 생성하는 스크립트
 */

const fs = require('fs').promises;
const path = require('path');

// 환경변수 로드
require('dotenv').config();

const DATA_DIR = process.env.DATA_DIR || './data';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './dist';
const TEMPLATE_DIR = './templates';

/**
 * 출력 디렉토리 생성
 */
async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`📁 Output directory ensured: ${OUTPUT_DIR}`);
    } catch (error) {
        console.error('❌ Error creating output directory:', error);
        throw error;
    }
}

/**
 * 최신 YouTube 데이터 로드
 */
async function loadLatestYouTubeData() {
    const youtubePath = path.join(DATA_DIR, 'latest-youtube.json');
    
    try {
        const data = await fs.readFile(youtubePath, 'utf8');
        const youtubeData = JSON.parse(data);
        console.log(`📺 Loaded YouTube data: ${youtubeData.data.length} entries`);
        return youtubeData.data;
    } catch (error) {
        console.error('❌ Error loading YouTube data:', error);
        throw new Error('YouTube data not found. Run get-youtube-links.js first.');
    }
}

/**
 * HTML 템플릿 로드
 */
async function loadTemplate() {
    const templatePath = path.join(TEMPLATE_DIR, 'chart-template.html');
    
    try {
        const template = await fs.readFile(templatePath, 'utf8');
        console.log('📄 Template loaded successfully');
        return template;
    } catch (error) {
        console.error('❌ Error loading template:', error);
        throw error;
    }
}

/**
 * 차트 데이터를 JavaScript 객체 배열로 변환
 */
function generateChartDataJS(youtubeData) {
    console.log('🔄 Converting data to JavaScript format...');
    
    const chartData = youtubeData.map(item => {
        const chartItem = {
            rank: item.rank,
            artist: item.artist,
            title: item.title,
            album: item.album || 'Unknown Album',
            credits: item.credits || []
        };
        
        // YouTube 데이터 추가
        if (item.youtube && item.youtube.videoId) {
            chartItem.youtubeId = item.youtube.videoId;
            chartItem.youtubeUrl = item.youtube.url;
        }
        
        return chartItem;
    });
    
    // JavaScript 코드로 변환
    const jsCode = `const chartData = ${JSON.stringify(chartData, null, 4)};`;
    
    console.log(`✅ Generated JavaScript data for ${chartData.length} chart entries`);
    return jsCode;
}

/**
 * 현재 날짜 정보 생성
 */
function generateDateInfo() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
    };
    
    const formattedDate = now.toLocaleDateString('en-US', options);
    const weekNumber = getWeekNumber(now);
    
    return {
        date: formattedDate,
        week: weekNumber,
        year: now.getFullYear(),
        timestamp: now.toISOString()
    };
}

/**
 * 주차 계산
 */
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * 통계 정보 생성
 */
function generateStats(youtubeData) {
    const stats = {
        totalTracks: youtubeData.length,
        tracksWithVideos: youtubeData.filter(item => item.youtube).length,
        uniqueArtists: [...new Set(youtubeData.map(item => item.artist))].length,
        topProducers: {},
        topLabels: {}
    };
    
    // 프로듀서 통계
    youtubeData.forEach(item => {
        if (item.credits) {
            item.credits.forEach(credit => {
                if (credit.role === 'PRODUCER') {
                    const producers = credit.people.split(', ');
                    producers.forEach(producer => {
                        const cleanProducer = producer.trim();
                        stats.topProducers[cleanProducer] = (stats.topProducers[cleanProducer] || 0) + 1;
                    });
                }
            });
        }
    });
    
    // 상위 프로듀서 정렬
    stats.topProducers = Object.entries(stats.topProducers)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    
    console.log('📊 Generated statistics:', stats);
    return stats;
}

/**
 * HTML 템플릿에 데이터 삽입
 */
function injectDataIntoTemplate(template, chartDataJS, dateInfo, stats) {
    console.log('🔧 Injecting data into template...');
    
    let html = template;
    
    // 차트 데이터 삽입
    html = html.replace('{{CHART_DATA}}', chartDataJS);
    
    // 날짜 정보 삽입
    html = html.replace('{{CHART_DATE}}', dateInfo.date);
    html = html.replace('{{CHART_WEEK}}', `Week ${dateInfo.week}`);
    html = html.replace('{{CHART_YEAR}}', dateInfo.year);
    html = html.replace('{{TIMESTAMP}}', dateInfo.timestamp);
    
    // 통계 정보 삽입
    html = html.replace('{{TOTAL_TRACKS}}', stats.totalTracks);
    html = html.replace('{{TRACKS_WITH_VIDEOS}}', stats.tracksWithVideos);
    html = html.replace('{{UNIQUE_ARTISTS}}', stats.uniqueArtists);
    html = html.replace('{{VIDEO_SUCCESS_RATE}}', Math.round((stats.tracksWithVideos / stats.totalTracks) * 100));
    
    // 상위 프로듀서 정보
    const topProducersList = Object.entries(stats.topProducers)
        .map(([name, count]) => `${name} (${count})`)
        .join(', ');
    html = html.replace('{{TOP_PRODUCERS}}', topProducersList || 'N/A');
    
    console.log('✅ Data injection completed');
    return html;
}

/**
 * HTML 파일 저장
 */
async function saveHTMLFile(html) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chart-${timestamp}.html`;
    const filepath = path.join(OUTPUT_DIR, filename);
    
    try {
        await fs.writeFile(filepath, html, 'utf8');
        console.log(`💾 HTML file saved to: ${filepath}`);
        
        // index.html로도 복사 (GitHub Pages용)
        const indexPath = path.join(OUTPUT_DIR, 'index.html');
        await fs.writeFile(indexPath, html, 'utf8');
        console.log(`🔗 Index file created: ${indexPath}`);
        
        return { filepath, indexPath };
    } catch (error) {
        console.error('❌ Error saving HTML file:', error);
        throw error;
    }
}

/**
 * 정적 자산 복사 (CSS, JS, 이미지 등)
 */
async function copyStaticAssets() {
    const assetsDir = path.join(TEMPLATE_DIR, 'assets');
    const outputAssetsDir = path.join(OUTPUT_DIR, 'assets');
    
    try {
        // assets 디렉토리가 존재하는지 확인
        await fs.access(assetsDir);
        
        // 출력 assets 디렉토리 생성
        await fs.mkdir(outputAssetsDir, { recursive: true });
        
        // assets 파일들 복사
        const files = await fs.readdir(assetsDir);
        for (const file of files) {
            const srcPath = path.join(assetsDir, file);
            const destPath = path.join(outputAssetsDir, file);
            await fs.copyFile(srcPath, destPath);
        }
        
        console.log(`📁 Static assets copied: ${files.length} files`);
    } catch (error) {
        console.log('ℹ️ No static assets directory found, skipping...');
    }
}

/**
 * 메타데이터 파일 생성
 */
async function generateMetadata(youtubeData, dateInfo, stats) {
    const metadata = {
        generated: dateInfo.timestamp,
        version: '1.0.0',
        source: 'kworb.net + tidal + youtube',
        chartInfo: {
            date: dateInfo.date,
            week: dateInfo.week,
            year: dateInfo.year,
            range: `1-${youtubeData.length}`
        },
        statistics: stats,
        dataFiles: {
            chart: 'latest-chart.json',
            credits: 'latest-credits.json',
            youtube: 'latest-youtube.json'
        }
    };
    
    const metadataPath = path.join(OUTPUT_DIR, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`📋 Metadata saved to: ${metadataPath}`);
    
    return metadata;
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('🚀 Starting HTML generation...');
    
    try {
        // 1. 출력 디렉토리 준비
        await ensureOutputDir();
        
        // 2. 데이터 로드
        const youtubeData = await loadLatestYouTubeData();
        const template = await loadTemplate();
        
        // 3. 데이터 변환
        const chartDataJS = generateChartDataJS(youtubeData);
        const dateInfo = generateDateInfo();
        const stats = generateStats(youtubeData);
        
        // 4. HTML 생성
        const html = injectDataIntoTemplate(template, chartDataJS, dateInfo, stats);
        
        // 5. 파일 저장
        const { filepath, indexPath } = await saveHTMLFile(html);
        
        // 6. 정적 자산 복사
        await copyStaticAssets();
        
        // 7. 메타데이터 생성
        const metadata = await generateMetadata(youtubeData, dateInfo, stats);
        
        console.log('✅ HTML generation completed successfully!');
        console.log(`📄 Files generated:`);
        console.log(`   - ${filepath}`);
        console.log(`   - ${indexPath}`);
        console.log(`📊 Chart info: ${stats.totalTracks} tracks, ${stats.tracksWithVideos} with videos`);
        console.log(`🎯 Success rate: ${Math.round((stats.tracksWithVideos / stats.totalTracks) * 100)}%`);
        
        return { filepath, indexPath, metadata };
    } catch (error) {
        console.error('❌ HTML generation failed:', error);
        process.exit(1);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    generateChartDataJS,
    injectDataIntoTemplate,
    saveHTMLFile,
    generateMetadata,
    main
};

