#!/usr/bin/env node

/**
 * kworb.net에서 글로벌 Spotify 주간 차트 데이터를 스크래핑하는 스크립트
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// 환경변수 로드
require('dotenv').config();

const KWORB_URL = 'https://kworb.net/spotify/country/global_weekly.html';
const CHART_RANGE = parseInt(process.env.CHART_RANGE) || 30;
const DATA_DIR = process.env.DATA_DIR || './data';

/**
 * 데이터 디렉토리 생성
 */
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`📁 Data directory ensured: ${DATA_DIR}`);
    } catch (error) {
        console.error('❌ Error creating data directory:', error);
        throw error;
    }
}

/**
 * kworb.net에서 차트 데이터 스크래핑
 */
async function scrapeKworbChart() {
    console.log(`🌐 Scraping chart data from: ${KWORB_URL}`);
    console.log(`📊 Chart range: 1-${CHART_RANGE}`);
    
    try {
        const response = await axios.get(KWORB_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 30000
        });
        
        const $ = cheerio.load(response.data);
        const chartData = [];
        
        // kworb 테이블에서 데이터 추출
        $('table tr').each((index, element) => {
            if (index === 0) return; // 헤더 스킵
            if (chartData.length >= CHART_RANGE) return; // 범위 제한
            
            const $row = $(element);
            const rank = chartData.length + 1;
            
            // 아티스트와 곡명 추출
            const artistAndTitle = $row.find('td').eq(1).text().trim();
            
            if (artistAndTitle && artistAndTitle !== '') {
                // "Artist - Title" 형식에서 분리
                const parts = artistAndTitle.split(' - ');
                let artist, title;
                
                if (parts.length >= 2) {
                    artist = parts[0].trim();
                    title = parts.slice(1).join(' - ').trim();
                } else {
                    // 분리가 안 되는 경우 전체를 제목으로
                    artist = 'Unknown Artist';
                    title = artistAndTitle;
                }
                
                chartData.push({
                    rank,
                    artist,
                    title,
                    rawText: artistAndTitle
                });
                
                console.log(`${rank}. ${artist} - ${title}`);
            }
        });
        
        if (chartData.length === 0) {
            throw new Error('No chart data found. Website structure might have changed.');
        }
        
        console.log(`✅ Successfully scraped ${chartData.length} chart entries`);
        return chartData;
        
    } catch (error) {
        console.error('❌ Error scraping kworb chart:', error.message);
        throw error;
    }
}

/**
 * 차트 데이터를 JSON 파일로 저장
 */
async function saveChartData(chartData) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chart-${timestamp}.json`;
    const filepath = path.join(DATA_DIR, filename);
    
    const dataToSave = {
        timestamp: new Date().toISOString(),
        source: KWORB_URL,
        range: CHART_RANGE,
        data: chartData
    };
    
    try {
        await fs.writeFile(filepath, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 Chart data saved to: ${filepath}`);
        
        // 최신 데이터로 링크 생성
        const latestPath = path.join(DATA_DIR, 'latest-chart.json');
        await fs.writeFile(latestPath, JSON.stringify(dataToSave, null, 2));
        console.log(`🔗 Latest chart data linked: ${latestPath}`);
        
        return filepath;
    } catch (error) {
        console.error('❌ Error saving chart data:', error);
        throw error;
    }
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('🚀 Starting kworb chart scraping...');
    
    try {
        await ensureDataDir();
        const chartData = await scrapeKworbChart();
        const savedFile = await saveChartData(chartData);
        
        console.log('✅ kworb scraping completed successfully!');
        console.log(`📄 Data saved to: ${savedFile}`);
        console.log(`📊 Total entries: ${chartData.length}`);
        
        return chartData;
    } catch (error) {
        console.error('❌ kworb scraping failed:', error);
        process.exit(1);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    scrapeKworbChart,
    saveChartData,
    main
};

