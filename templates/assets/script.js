/**
 * 차트파인더 레트로 터미널 인터페이스 JavaScript
 */

class ChartPlayer {
    constructor() {
        this.currentIndex = 0;
        this.player = null;
        this.isPlayerReady = false;
        this.chartData = window.chartData || [];
        
        this.init();
    }
    
    init() {
        this.setupProgressBar();
        this.setupKeyboardControls();
        this.displayCurrentTrack();
        this.setupYouTubePlayer();
        
        console.log('🎵 Chart Player initialized with', this.chartData.length, 'tracks');
    }
    
    setupProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        progressBar.innerHTML = '';
        
        for (let i = 0; i < this.chartData.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            dot.addEventListener('click', () => this.goToTrack(i));
            progressBar.appendChild(dot);
        }
        
        this.updateProgressBar();
    }
    
    updateProgressBar() {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'current');
            if (index < this.currentIndex) {
                dot.classList.add('active');
            } else if (index === this.currentIndex) {
                dot.classList.add('current');
            }
        });
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousTrack();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    this.nextTrack();
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToTrack(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToTrack(this.chartData.length - 1);
                    break;
            }
        });
        
        // 키보드 힌트 추가
        this.addKeyboardHint();
    }
    
    addKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.innerHTML = `
            <kbd>←</kbd><kbd>→</kbd> Navigate | 
            <kbd>Space</kbd> Play/Pause | 
            <kbd>Home</kbd><kbd>End</kbd> First/Last
        `;
        document.body.appendChild(hint);
    }
    
    displayCurrentTrack() {
        if (this.currentIndex >= this.chartData.length) return;
        
        const track = this.chartData[this.currentIndex];
        
        // 기본 정보 업데이트
        document.getElementById('current-rank').textContent = this.currentIndex + 1;
        document.getElementById('rank-display').textContent = String(track.rank).padStart(2, '0');
        document.getElementById('song-title').textContent = track.title;
        document.getElementById('artist-name').textContent = track.artist;
        document.getElementById('album-name').textContent = track.album;
        
        // 크레딧 정보 업데이트
        this.displayCredits(track.credits);
        
        // YouTube 비디오 업데이트
        this.updateYouTubeVideo(track.youtubeId);
        
        // 진행 바 업데이트
        this.updateProgressBar();
        
        // 페이드인 애니메이션
        document.querySelector('.terminal-content').classList.add('fade-in');
        setTimeout(() => {
            document.querySelector('.terminal-content').classList.remove('fade-in');
        }, 500);
        
        console.log(`🎵 Now displaying: ${track.artist} - ${track.title}`);
    }
    
    displayCredits(credits) {
        const creditsList = document.getElementById('credits-list');
        creditsList.innerHTML = '';
        
        if (!credits || credits.length === 0) {
            creditsList.innerHTML = '<li><span class="credit-role">No credits available</span></li>';
            return;
        }
        
        credits.forEach(credit => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="credit-role">${credit.role}:</span>
                <span class="credit-people">${credit.people}</span>
            `;
            creditsList.appendChild(li);
        });
    }
    
    setupYouTubePlayer() {
        // YouTube IFrame API가 로드되면 플레이어 초기화
        window.onYouTubeIframeAPIReady = () => {
            this.initYouTubePlayer();
        };
        
        // API가 이미 로드된 경우
        if (window.YT && window.YT.Player) {
            this.initYouTubePlayer();
        }
    }
    
    initYouTubePlayer() {
        this.player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            playerVars: {
                'playsinline': 1,
                'rel': 0,
                'showinfo': 0,
                'controls': 1,
                'modestbranding': 1
            },
            events: {
                'onReady': () => {
                    this.isPlayerReady = true;
                    console.log('🎬 YouTube player ready');
                    this.updateYouTubeVideo(this.chartData[this.currentIndex]?.youtubeId);
                },
                'onError': (event) => {
                    console.error('🎬 YouTube player error:', event.data);
                    this.showVideoUnavailable();
                }
            }
        });
    }
    
    updateYouTubeVideo(videoId) {
        if (!this.isPlayerReady || !this.player) {
            console.log('🎬 Player not ready, will update when ready');
            return;
        }
        
        if (videoId) {
            try {
                this.player.loadVideoById(videoId);
                console.log('🎬 Loading video:', videoId);
            } catch (error) {
                console.error('🎬 Error loading video:', error);
                this.showVideoUnavailable();
            }
        } else {
            this.showVideoUnavailable();
        }
    }
    
    showVideoUnavailable() {
        const playerContainer = document.getElementById('youtube-player');
        playerContainer.innerHTML = `
            <div class="video-unavailable">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <div>Video unavailable</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">
                    Watch on YouTube
                </div>
            </div>
        `;
    }
    
    nextTrack() {
        if (this.currentIndex < this.chartData.length - 1) {
            this.currentIndex++;
            this.displayCurrentTrack();
        }
    }
    
    previousTrack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayCurrentTrack();
        }
    }
    
    goToTrack(index) {
        if (index >= 0 && index < this.chartData.length) {
            this.currentIndex = index;
            this.displayCurrentTrack();
        }
    }
    
    togglePlayPause() {
        if (!this.isPlayerReady || !this.player) return;
        
        try {
            const state = this.player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                this.player.pauseVideo();
            } else {
                this.player.playVideo();
            }
        } catch (error) {
            console.error('🎬 Error toggling play/pause:', error);
        }
    }
    
    // 자동 재생 기능 (선택사항)
    startAutoPlay(interval = 30000) {
        this.autoPlayInterval = setInterval(() => {
            this.nextTrack();
            if (this.currentIndex === this.chartData.length - 1) {
                this.currentIndex = 0;
                this.displayCurrentTrack();
            }
        }, interval);
    }
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
}

// 터미널 효과 추가
class TerminalEffects {
    static addGlowEffect() {
        const glowElements = document.querySelectorAll('.song-title, .artist-name, .rank-display');
        glowElements.forEach(el => {
            el.classList.add('glow');
        });
    }
    
    static addTypingEffect(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;
        
        const typeInterval = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            
            if (i >= text.length) {
                clearInterval(typeInterval);
            }
        }, speed);
    }
    
    static addScanlineEffect() {
        const scanline = document.createElement('div');
        scanline.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ff6600, transparent);
            animation: scanline 3s linear infinite;
            pointer-events: none;
            z-index: 1000;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scanline {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(100vh); opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(scanline);
    }
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Chart Finder Terminal initializing...');
    
    // 차트 데이터 검증
    if (!window.chartData || !Array.isArray(window.chartData) || window.chartData.length === 0) {
        console.error('❌ No chart data available');
        document.body.innerHTML = `
            <div style="color: #ff6600; font-family: 'VT323', monospace; text-align: center; padding: 50px;">
                <h1>ERROR: NO CHART DATA</h1>
                <p>Please run the data collection scripts first.</p>
            </div>
        `;
        return;
    }
    
    // 차트 플레이어 초기화
    const chartPlayer = new ChartPlayer();
    
    // 터미널 효과 추가
    TerminalEffects.addGlowEffect();
    TerminalEffects.addScanlineEffect();
    
    // 전역 객체로 노출 (디버깅용)
    window.chartPlayer = chartPlayer;
    
    console.log('✅ Chart Finder Terminal ready!');
    console.log('🎮 Use arrow keys to navigate, space to play/pause');
});

// 에러 핸들링
window.addEventListener('error', (e) => {
    console.error('💥 Application error:', e.error);
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (window.chartPlayer) {
        window.chartPlayer.stopAutoPlay();
    }
});

