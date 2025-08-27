#!/usr/bin/env node

/**
 * Manus Agent를 통해 TIDAL 크레딧 정보를 수집하는 스크립트
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// 환경변수 로드
require('dotenv').config();

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_API_BASE_URL = process.env.MANUS_API_BASE_URL || 'https://api.manus.ai';
const DATA_DIR = process.env.DATA_DIR || './data';

/**
 * Manus API 클라이언트 설정
 */
const manusClient = axios.create({
    baseURL: MANUS_API_BASE_URL,
    headers: {
        'Authorization': `Bearer ${MANUS_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 300000 // 5분 타임아웃 (크레딧 수집은 시간이 오래 걸릴 수 있음)
});

/**
 * 최신 차트 데이터 로드
 */
async function loadLatestChartData() {
    const chartPath = path.join(DATA_DIR, 'latest-chart.json');
    
    try {
        const data = await fs.readFile(chartPath, 'utf8');
        const chartData = JSON.parse(data);
        console.log(`📊 Loaded chart data: ${chartData.data.length} entries`);
        return chartData.data;
    } catch (error) {
        console.error('❌ Error loading chart data:', error);
        throw new Error('Chart data not found. Run scrape-kworb.js first.');
    }
}

/**
 * Manus Agent에게 크레딧 수집 작업 요청
 */
async function requestCreditsCollection(chartData) {
    console.log('🤖 Requesting TIDAL credits collection from Manus Agent...');
    
    // Manus Agent에게 보낼 프롬프트 생성
    const prompt = `
다음 글로벌 Spotify 주간 차트 1위부터 ${chartData.length}위까지 각 곡의 TIDAL 크레딧 정보를 수집해주세요.

차트 목록:
${chartData.map(item => `${item.rank}위. ${item.artist} - ${item.title}`).join('\n')}

각 곡에 대해 다음 형식으로 크레딧 정보를 수집해주세요:

{
    rank: ${chartData[0].rank},
    artist: "${chartData[0].artist}",
    title: "${chartData[0].title}",
    album: "앨범명",
    credits: [
        { role: "PRODUCER", people: "프로듀서1, 프로듀서2" },
        { role: "COMPOSER", people: "작곡가1, 작곡가2" },
        { role: "LYRICIST", people: "작사가1, 작사가2" },
        { role: "MASTERING ENGINEER", people: "마스터링 엔지니어" },
        { role: "MIXING ENGINEER", people: "믹싱 엔지니어" },
        // 기타 모든 크레딧 정보...
    ]
}

TIDAL에서 각 곡을 검색하여 상세한 크레딧 정보를 수집해주세요. 
결과는 JSON 배열 형태로 제공해주세요.
`;

    try {
        const response = await manusClient.post('/v1/tasks', {
            type: 'data_collection',
            prompt: prompt,
            parameters: {
                source: 'tidal',
                format: 'json',
                timeout: 1800 // 30분
            }
        });
        
        const taskId = response.data.task_id;
        console.log(`📝 Task created: ${taskId}`);
        
        return taskId;
    } catch (error) {
        console.error('❌ Error creating Manus task:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Manus Agent 작업 상태 확인 및 결과 대기
 */
async function waitForTaskCompletion(taskId) {
    console.log(`⏳ Waiting for task completion: ${taskId}`);
    
    const maxAttempts = 60; // 최대 30분 대기 (30초 간격)
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await manusClient.get(`/v1/tasks/${taskId}`);
            const task = response.data;
            
            console.log(`📊 Task status: ${task.status} (${attempts + 1}/${maxAttempts})`);
            
            if (task.status === 'completed') {
                console.log('✅ Task completed successfully!');
                return task.result;
            } else if (task.status === 'failed') {
                throw new Error(`Task failed: ${task.error}`);
            }
            
            // 30초 대기
            await new Promise(resolve => setTimeout(resolve, 30000));
            attempts++;
            
        } catch (error) {
            console.error('❌ Error checking task status:', error.response?.data || error.message);
            throw error;
        }
    }
    
    throw new Error('Task timeout: Credits collection took too long');
}

/**
 * 크레딧 데이터 검증 및 정리
 */
function validateAndCleanCredits(creditsData) {
    console.log('🔍 Validating and cleaning credits data...');
    
    if (!Array.isArray(creditsData)) {
        throw new Error('Credits data must be an array');
    }
    
    const cleanedData = creditsData.map(item => {
        // 필수 필드 검증
        if (!item.rank || !item.artist || !item.title) {
            console.warn(`⚠️ Missing required fields for item:`, item);
            return null;
        }
        
        // 크레딧 배열 검증
        if (!Array.isArray(item.credits)) {
            console.warn(`⚠️ Invalid credits format for ${item.artist} - ${item.title}`);
            item.credits = [];
        }
        
        // 크레딧 정리
        item.credits = item.credits.filter(credit => 
            credit.role && credit.people && 
            typeof credit.role === 'string' && 
            typeof credit.people === 'string'
        );
        
        return item;
    }).filter(item => item !== null);
    
    console.log(`✅ Validated ${cleanedData.length} credit entries`);
    return cleanedData;
}

/**
 * 크레딧 데이터 저장
 */
async function saveCreditsData(creditsData) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `credits-${timestamp}.json`;
    const filepath = path.join(DATA_DIR, filename);
    
    const dataToSave = {
        timestamp: new Date().toISOString(),
        source: 'manus-agent-tidal',
        data: creditsData
    };
    
    try {
        await fs.writeFile(filepath, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 Credits data saved to: ${filepath}`);
        
        // 최신 데이터로 링크 생성
        const latestPath = path.join(DATA_DIR, 'latest-credits.json');
        await fs.writeFile(latestPath, JSON.stringify(dataToSave, null, 2));
        console.log(`🔗 Latest credits data linked: ${latestPath}`);
        
        return filepath;
    } catch (error) {
        console.error('❌ Error saving credits data:', error);
        throw error;
    }
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('🚀 Starting TIDAL credits collection via Manus Agent...');
    
    if (!MANUS_API_KEY) {
        throw new Error('MANUS_API_KEY environment variable is required');
    }
    
    try {
        // 1. 차트 데이터 로드
        const chartData = await loadLatestChartData();
        
        // 2. Manus Agent에게 크레딧 수집 요청
        const taskId = await requestCreditsCollection(chartData);
        
        // 3. 작업 완료 대기
        const creditsResult = await waitForTaskCompletion(taskId);
        
        // 4. 결과 데이터 검증 및 정리
        const cleanedCredits = validateAndCleanCredits(creditsResult);
        
        // 5. 데이터 저장
        const savedFile = await saveCreditsData(cleanedCredits);
        
        console.log('✅ TIDAL credits collection completed successfully!');
        console.log(`📄 Data saved to: ${savedFile}`);
        console.log(`🎵 Total credits collected: ${cleanedCredits.length}`);
        
        return cleanedCredits;
    } catch (error) {
        console.error('❌ Credits collection failed:', error);
        process.exit(1);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    requestCreditsCollection,
    waitForTaskCompletion,
    validateAndCleanCredits,
    saveCreditsData,
    main
};

