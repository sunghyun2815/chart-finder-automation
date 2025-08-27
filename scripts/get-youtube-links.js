#!/usr/bin/env node

/**
 * YouTube Data API v3를 사용하여 각 곡의 공식 뮤직비디오 링크를 수집하는 스크립트
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// 환경변수 로드
require('dotenv').config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const DATA_DIR = process.env.DATA_DIR || './data';

// YouTube API 클라이언트 초기화
const youtube = google.youtube({
    version: 'v3',
    auth: YOUTUBE_API_KEY
});

/**
 * 최신 크레딧 데이터 로드
 */
async function loadLatestCreditsData() {
    const creditsPath = path.join(DATA_DIR, 'latest-credits.json');
    
    try {
        const data = await fs.readFile(creditsPath, 'utf8');
        const creditsData = JSON.parse(data);
        console.log(`🎵 Loaded credits data: ${creditsData.data.length} entries`);
        return creditsData.data;
    } catch (error) {
        console.error('❌ Error loading credits data:', error);
        throw new Error('Credits data not found. Run trigger-manus-agent.js first.');
    }
}

/**
 * YouTube에서 특정 곡 검색
 */
async function searchYouTubeVideo(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Searching YouTube for: ${query}`);
    
    try {
        const response = await youtube.search.list({
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 10,
            order: 'relevance',
            videoCategoryId: '10', // Music category
            regionCode: 'US'
        });
        
        const videos = response.data.items;
        
        if (videos.length === 0) {
            console.warn(`⚠️ No videos found for: ${query}`);
            return null;
        }
        
        // 공식 채널이나 높은 조회수의 비디오 우선 선택
        const officialVideo = findBestVideo(videos, artist, title);
        
        if (officialVideo) {
            const videoUrl = `https://www.youtube.com/watch?v=${officialVideo.id.videoId}`;
            console.log(`✅ Found video: ${videoUrl}`);
            return {
                videoId: officialVideo.id.videoId,
                url: videoUrl,
                title: officialVideo.snippet.title,
                channelTitle: officialVideo.snippet.channelTitle,
                publishedAt: officialVideo.snippet.publishedAt,
                thumbnails: officialVideo.snippet.thumbnails
            };
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Error searching YouTube for "${query}":`, error.message);
        return null;
    }
}

/**
 * 최적의 비디오 선택 로직
 */
function findBestVideo(videos, artist, title) {
    // 1. 공식 채널 키워드 (VEVO, Records, Music 등)
    const officialKeywords = ['vevo', 'records', 'music', 'official', artist.toLowerCase()];
    
    // 2. 제목에서 불필요한 키워드 (cover, remix, live 등)
    const excludeKeywords = ['cover', 'remix', 'live', 'acoustic', 'karaoke', 'instrumental'];
    
    let bestVideo = null;
    let bestScore = 0;
    
    for (const video of videos) {
        let score = 0;
        const channelTitle = video.snippet.channelTitle.toLowerCase();
        const videoTitle = video.snippet.title.toLowerCase();
        
        // 공식 채널 점수
        for (const keyword of officialKeywords) {
            if (channelTitle.includes(keyword)) {
                score += 10;
                break;
            }
        }
        
        // 제목 정확도 점수
        if (videoTitle.includes(artist.toLowerCase()) && videoTitle.includes(title.toLowerCase())) {
            score += 5;
        }
        
        // 공식 비디오 키워드 점수
        if (videoTitle.includes('official') || videoTitle.includes('music video')) {
            score += 3;
        }
        
        // 제외 키워드 패널티
        for (const keyword of excludeKeywords) {
            if (videoTitle.includes(keyword)) {
                score -= 5;
                break;
            }
        }
        
        // 첫 번째 결과 보너스 (관련성이 높을 가능성)
        if (videos.indexOf(video) === 0) {
            score += 2;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestVideo = video;
        }
    }
    
    return bestVideo;
}

/**
 * 모든 곡에 대해 YouTube 링크 수집
 */
async function collectAllYouTubeLinks(creditsData) {
    console.log(`📺 Collecting YouTube links for ${creditsData.length} songs...`);
    
    const results = [];
    const delay = 1000; // API 호출 간 1초 대기 (Rate limit 방지)
    
    for (let i = 0; i < creditsData.length; i++) {
        const item = creditsData[i];
        console.log(`\n📊 Processing ${item.rank}/${creditsData.length}: ${item.artist} - ${item.title}`);
        
        try {
            const youtubeData = await searchYouTubeVideo(item.artist, item.title);
            
            results.push({
                ...item,
                youtube: youtubeData
            });
            
            // API Rate limit 방지를 위한 대기
            if (i < creditsData.length - 1) {
                console.log(`⏳ Waiting ${delay}ms before next request...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${item.artist} - ${item.title}:`, error.message);
            
            // 에러가 발생해도 계속 진행
            results.push({
                ...item,
                youtube: null
            });
        }
    }
    
    const successCount = results.filter(item => item.youtube !== null).length;
    console.log(`\n✅ YouTube link collection completed!`);
    console.log(`📊 Success rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
    
    return results;
}

/**
 * YouTube 링크가 포함된 데이터 저장
 */
async function saveYouTubeData(youtubeData) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `youtube-${timestamp}.json`;
    const filepath = path.join(DATA_DIR, filename);
    
    const dataToSave = {
        timestamp: new Date().toISOString(),
        source: 'youtube-api-v3',
        data: youtubeData
    };
    
    try {
        await fs.writeFile(filepath, JSON.stringify(dataToSave, null, 2));
        console.log(`💾 YouTube data saved to: ${filepath}`);
        
        // 최신 데이터로 링크 생성
        const latestPath = path.join(DATA_DIR, 'latest-youtube.json');
        await fs.writeFile(latestPath, JSON.stringify(dataToSave, null, 2));
        console.log(`🔗 Latest YouTube data linked: ${latestPath}`);
        
        return filepath;
    } catch (error) {
        console.error('❌ Error saving YouTube data:', error);
        throw error;
    }
}

/**
 * YouTube API 할당량 확인
 */
async function checkApiQuota() {
    try {
        // 간단한 검색으로 API 상태 확인
        await youtube.search.list({
            part: 'snippet',
            q: 'test',
            maxResults: 1
        });
        console.log('✅ YouTube API is accessible');
        return true;
    } catch (error) {
        console.error('❌ YouTube API error:', error.message);
        if (error.message.includes('quota')) {
            throw new Error('YouTube API quota exceeded. Please try again tomorrow.');
        }
        throw error;
    }
}

/**
 * 메인 실행 함수
 */
async function main() {
    console.log('🚀 Starting YouTube links collection...');
    
    if (!YOUTUBE_API_KEY) {
        throw new Error('YOUTUBE_API_KEY environment variable is required');
    }
    
    try {
        // 1. API 상태 확인
        await checkApiQuota();
        
        // 2. 크레딧 데이터 로드
        const creditsData = await loadLatestCreditsData();
        
        // 3. YouTube 링크 수집
        const youtubeData = await collectAllYouTubeLinks(creditsData);
        
        // 4. 데이터 저장
        const savedFile = await saveYouTubeData(youtubeData);
        
        console.log('✅ YouTube links collection completed successfully!');
        console.log(`📄 Data saved to: ${savedFile}`);
        console.log(`📺 Total videos found: ${youtubeData.filter(item => item.youtube).length}`);
        
        return youtubeData;
    } catch (error) {
        console.error('❌ YouTube links collection failed:', error);
        process.exit(1);
    }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = {
    searchYouTubeVideo,
    collectAllYouTubeLinks,
    saveYouTubeData,
    main
};

