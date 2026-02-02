let chart = null;
let backtestChart = null;
let games = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadGames();
    if (document.getElementById('analysisTableBody')) {
        loadGameAnalysis();
    }
    if (document.getElementById('backtestChart')) {
        loadBacktest();
    }
});

// Load all games
async function loadGames() {
    try {
        const response = await fetch('/api/games');
        if (!response.ok) throw new Error('Failed to load games');
        
        games = await response.json();
        
        const select = document.getElementById('gameSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select a game --</option>';
        
        games.forEach(game => {
            const option = document.createElement('option');
            option.value = game.id;
            
            // Format: PHI vs BOS - Oct 22, 2025
            const slug = game.slug;
            const parts = slug.split('-');
            const homeTeam = parts[1] ? parts[1].toUpperCase() : '';
            const awayTeam = parts[2] ? parts[2].toUpperCase() : '';
            const date = new Date(game.game_date);
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            option.textContent = `${homeTeam} vs ${awayTeam} - ${dateStr}`;
            option.dataset.slug = slug;
            option.dataset.gameDate = game.game_start_utc;
            
            select.appendChild(option);
        });
        
        select.addEventListener('change', onGameSelected);
        
    } catch (error) {
        showError('Failed to load games: ' + error.message);
    }
}

// Handle game selection
async function onGameSelected(event) {
    const gameId = event.target.value;
    
    if (!gameId) {
        hideGameInfo();
        hideMetrics();
        if (chart) {
            chart.destroy();
            chart = null;
        }
        return;
    }
    
    try {
        const response = await fetch(`/api/price-history/${gameId}`);
        if (!response.ok) throw new Error('Failed to load price history');
        
        const data = await response.json();
        const history = data.history;
        const avg48h = data.avg_48h_price;
        
        // Update game info
        const selectedOption = event.target.selectedOptions[0];
        showGameInfo(selectedOption.textContent, selectedOption.dataset.gameDate, history.length);
        
        // Update metrics
        showMetrics(avg48h);
        
        // Update chart
        updateChart(history, avg48h);
        
    } catch (error) {
        showError('Failed to load price history: ' + error.message);
    }
}

// Show game information
function showGameInfo(title, gameDate, dataPoints) {
    const gameInfo = document.getElementById('gameInfo');
    const gameStartDate = new Date(gameDate);
    const dateStr = gameStartDate.toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
    
    document.getElementById('gameTitle').textContent = title;
    document.getElementById('gameDate').textContent = `Game Time: ${dateStr}`;
    document.getElementById('dataPoints').textContent = `Data Points: ${dataPoints}`;
    
    gameInfo.classList.add('show');
}

// Hide game information
function hideGameInfo() {
    const gameInfo = document.getElementById('gameInfo');
    if (gameInfo) gameInfo.classList.remove('show');
}

// Show metrics
function showMetrics(avg48h) {
    const metricsDiv = document.getElementById('metrics');
    const avg48hValue = document.getElementById('avg48hValue');
    
    if (avg48h !== null && avg48h !== undefined) {
        avg48hValue.textContent = avg48h.toFixed(2) + '%';
        metricsDiv.style.display = 'grid';
    } else {
        avg48hValue.textContent = 'N/A';
        metricsDiv.style.display = 'grid';
    }
}

// Hide metrics
function hideMetrics() {
    const metricsDiv = document.getElementById('metrics');
    if (metricsDiv) metricsDiv.style.display = 'none';
}

// Update chart with new data
function updateChart(history, avg48h) {
    const timestamps = history.map(h => h.timestamp_utc);
    const prices = history.map(h => h.price);
    
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }
    
    // Create datasets
    const datasets = [{
        label: 'Market Price (%)',
        data: prices,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
    }];
    
    // Add 48h average line if available
    if (avg48h !== null && avg48h !== undefined) {
        datasets.push({
            label: '48h Avg Entry Price',
            data: Array(timestamps.length).fill(avg48h),
            borderColor: '#ff6b6b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [10, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0
        });
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return 'Price: ' + context.parsed.y.toFixed(2) + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time (UTC)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Market Price (%)'
                    },
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    if (!errorDiv) return;
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Load game analysis data
async function loadGameAnalysis() {
    try {
        const response = await fetch('/api/game-analysis');
        if (!response.ok) throw new Error('Failed to load game analysis');
        
        const analysisData = await response.json();
        displayAnalysisTable(analysisData);
        
    } catch (error) {
        showError('Failed to load game analysis: ' + error.message);
    }
}

// Display analysis data in table
function displayAnalysisTable(data) {
    const tbody = document.getElementById('analysisTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No data available</td></tr>';
        return;
    }
    
    data.forEach(game => {
        const row = document.createElement('tr');
        
        // Parse game details
        const date = new Date(game.game_date);
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        // Parse matchup from slug
        const slug = game.slug;
        const parts = slug.split('-');
        const homeTeam = parts[1] ? parts[1].toUpperCase() : '';
        const awayTeam = parts[2] ? parts[2].toUpperCase() : '';
        const matchup = `${homeTeam} vs ${awayTeam}`;
        
        // Format prices and ROI
        const avgPrice = game.avg_48h_price !== null ? game.avg_48h_price.toFixed(2) + '%' : 'N/A';
        const finalPrice = game.final_price !== null ? game.final_price.toFixed(2) + '%' : 'N/A';
        
        let roiClass = 'neutral-roi';
        let roiText = 'N/A';
        if (game.roi_percent !== null) {
            const roi = game.roi_percent;
            roiClass = roi >= 0 ? 'positive-roi' : 'negative-roi';
            roiText = roi.toFixed(2) + '%';
        }
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${matchup}</td>
            <td>${avgPrice}</td>
            <td>${finalPrice}</td>
            <td class="${roiClass}">${roiText}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load backtest simulation data
async function loadBacktest() {
    try {
        const response = await fetch('/api/backtest');
        if (!response.ok) throw new Error('Failed to load backtest data');
        
        const backtestData = await response.json();
        displayBacktestResults(backtestData);
        
    } catch (error) {
        showError('Failed to load backtest: ' + error.message);
    }
}

// Display backtest results
function displayBacktestResults(data) {
    if (data.length === 0) return;
    
    // Calculate stats
    const initialCapital = 10000;
    const finalBankroll = data[data.length - 1].bankroll;
    const totalReturn = finalBankroll - initialCapital;
    const returnPercent = ((finalBankroll - initialCapital) / initialCapital) * 100;
    
    // Update stats
    const finalBankrollEl = document.getElementById('finalBankroll');
    const totalReturnEl = document.getElementById('totalReturn');
    const returnPercentEl = document.getElementById('returnPercent');
    
    if (finalBankrollEl) finalBankrollEl.textContent = '$' + finalBankroll.toFixed(2);
    if (totalReturnEl) totalReturnEl.textContent = (totalReturn >= 0 ? '+' : '') + '$' + totalReturn.toFixed(2);
    if (returnPercentEl) returnPercentEl.textContent = (returnPercent >= 0 ? '+' : '') + returnPercent.toFixed(2) + '%';
    
    // Color code based on profit/loss
    if (totalReturn >= 0) {
        if (returnPercentEl) returnPercentEl.classList.add('positive');
        if (totalReturnEl) totalReturnEl.classList.add('positive');
        if (finalBankrollEl) finalBankrollEl.classList.add('positive');
    } else {
        if (returnPercentEl) returnPercentEl.classList.add('negative');
        if (totalReturnEl) totalReturnEl.classList.add('negative');
        if (finalBankrollEl) finalBankrollEl.classList.add('negative');
    }
    
    // Create chart
    const dates = data.map(d => {
        const date = new Date(d.game_date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const bankrolls = data.map(d => d.bankroll);
    
    const ctx = document.getElementById('backtestChart').getContext('2d');
    
    if (backtestChart) {
        backtestChart.destroy();
    }
    
    backtestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Bankroll ($)',
                data: bankrolls,
                borderColor: totalReturn >= 0 ? '#28a745' : '#dc3545',
                backgroundColor: totalReturn >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.1,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: totalReturn >= 0 ? '#28a745' : '#dc3545',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }, {
                label: 'Initial Capital',
                data: Array(dates.length).fill(initialCapital),
                borderColor: '#666',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [10, 5],
                fill: false,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Game Date'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Bankroll ($)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}
