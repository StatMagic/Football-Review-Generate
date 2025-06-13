// DOM Elements
let matchVideoPlayer;
let videoUrlInput;
let updateVideoButton;
let gameFileInput;
let uploadGameFileButton;
let playerSelect;
let actionSelect;
let momentsList;
let selectionSummary;

// Video player state
let videoPlayer = null;
let gameMoments = [];
let uniquePlayers = new Set();
let uniqueActions = new Set();
let isPlayingAll = false; // New state variable to track "Play All" status.

// Game Info Upload and Processing
let player360Data = null;
let player360Videos = {};
let player360Thumbnails = {};

// Initialize DOM elements
function initializeDOMElements() {
    matchVideoPlayer = document.getElementById('matchVideoPlayer');
    videoUrlInput = document.getElementById('videoUrlInput');
    updateVideoButton = document.getElementById('updateVideoButton');
    gameFileInput = document.getElementById('gameFileInput');
    uploadGameFileButton = document.getElementById('uploadGameFileButton');
    playerSelect = document.getElementById('playerSelect');
    actionSelect = document.getElementById('actionSelect');
    momentsList = document.getElementById('momentsList');
    selectionSummary = document.getElementById('selectionSummary');

    // Add event listeners only if elements exist
    if (updateVideoButton) {
        updateVideoButton.addEventListener('click', updateVideo);
    }

    if (uploadGameFileButton && gameFileInput) {
        uploadGameFileButton.addEventListener('click', () => {
            gameFileInput.click();
        });

        gameFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            const statusEl = document.getElementById('gameLogUploadStatus');
            statusEl.classList.remove('visible');

            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    processGameFile(file);
                    showUploadStatus('✓ Success', 'success', 3000, 'gameLogUploadStatus');
                } catch (error) {
                    console.error('Error processing game log:', error);
                    showUploadStatus('Error processing file', 'error', null, 'gameLogUploadStatus');
                }
            };
            reader.onerror = () => {
                console.error('Error reading file');
                showUploadStatus('Error reading file', 'error', null, 'gameLogUploadStatus');
            };
            reader.readAsText(file);
        });
    }

    if (playerSelect) {
        playerSelect.addEventListener('change', () => {
            updateActionSelect(playerSelect.value);
            updateMomentsList();
        });
    }

    if (actionSelect) {
        actionSelect.addEventListener('change', () => {
            updateMomentsList();
        });
    }
}

// Initialize video player
function initializeVideoPlayer() {
    if (!matchVideoPlayer) return;

    // Create video element
    const videoElement = document.createElement('video');
    videoElement.controls = true;
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    matchVideoPlayer.innerHTML = '';
    matchVideoPlayer.appendChild(videoElement);
    videoPlayer = videoElement;

    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);

    // Set up the playback speed control now that the video player exists.
    const playbackSpeedSelect = document.getElementById('playbackSpeed');
    if (playbackSpeedSelect) {
        playbackSpeedSelect.addEventListener('change', (event) => {
            if (videoPlayer) {
                videoPlayer.playbackRate = parseFloat(event.target.value);
            }
        });
    }
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
    // Ignore if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }

    if (!videoPlayer) return;

    switch (event.key.toLowerCase()) {
        case ' ': // Spacebar
            event.preventDefault();
            if (videoPlayer.paused) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
            break;
        case 'arrowright': // Forward 5 seconds
            event.preventDefault();
            videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 5);
            break;
        case 'arrowleft': // Rewind 5 seconds
            event.preventDefault();
            videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5);
            break;
    }
}

function updateVideo() {
    if (!videoUrlInput || !videoPlayer) return;

    const videoUrl = videoUrlInput.value.trim();
    if (!videoUrl) {
        alert('Please enter a video URL');
        return;
    }

    // Initialize player if not already done
    if (!videoPlayer) {
        initializeVideoPlayer();
    }

    // Update video source
    videoPlayer.src = videoUrl;
    videoPlayer.load();
    videoPlayer.play().catch(error => {
        console.error('Error playing video:', error);
        // Some browsers require user interaction before playing
        alert('Please click the play button to start the video');
    });
}

async function processGameFile(file) {
    try {
        const text = await file.text();
        if (!text.trim()) {
            alert('The file is empty');
            return;
        }
        parseGameFile(text);
        updatePlayerSelect();
        updateActionSelect(null); // Reset and disable action select
        updateMomentsList();
    } catch (error) {
        console.error('Error processing game file:', error);
        alert('Error processing game file. Please make sure it\'s a valid text file.');
    }
}

function parseGameFile(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        alert('Invalid game log format. The file should contain at least a header and one data line.');
        return;
    }

    gameMoments = [];
    uniquePlayers.clear();
    uniqueActions.clear();

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('|').map(part => part.trim());
        if (parts.length < 8) {
            console.warn(`Skipping invalid line ${i + 1}: ${lines[i]}`);
            continue;
        }

        const [id, name, jersey, manual, event, inpoint, outpoint, inMomentsFile, isPlayerHighlight] = parts;
        if (id && event) {
            const moment = {
                id,
                name,
                jersey,
                manual,
                event,
                inpoint,
                outpoint,
                inMomentsFile: inMomentsFile === 'True',
                isPlayerHighlight: isPlayerHighlight === 'True'
            };
            gameMoments.push(moment);
            uniquePlayers.add(id);
            uniqueActions.add(event);
        }
    }

    if (gameMoments.length === 0) {
        alert('No valid moments found in the game log.');
        return;
    }

    console.log('Found unique actions:', Array.from(uniqueActions));
    console.log('Found unique players:', Array.from(uniquePlayers));

    // Sort moments by timestamp
    gameMoments.sort((a, b) => {
        const timeA = convertTimestampToSeconds(a.inpoint);
        const timeB = convertTimestampToSeconds(b.inpoint);
        return timeA - timeB;
    });
}

function convertTimestampToSeconds(timestamp) {
    const [hours, minutes, seconds] = timestamp.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

function updatePlayerSelect() {
    if (!playerSelect) return;

    playerSelect.innerHTML = '';
    
    // Add a default "Select Player" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Player';
    playerSelect.appendChild(defaultOption);

    // Add the 'Match' option at the top
    const matchOption = document.createElement('option');
    matchOption.value = '__MATCH__';
    matchOption.textContent = 'Match (All Players)';
    playerSelect.appendChild(matchOption);

    // Add the rest of the players
    Array.from(uniquePlayers).sort().forEach(playerId => {
        const moment = gameMoments.find(m => m.id === playerId);
        const option = document.createElement('option');
        option.value = playerId;
        option.textContent = `ID: ${moment.id}, Name: ${moment.name}, Manual ID: ${moment.manual}, Jersey: ${moment.jersey}`;
        playerSelect.appendChild(option);
    });
}

function updateActionSelect(playerId) {
    if (!actionSelect) return;

    actionSelect.innerHTML = '';

    if (!playerId) {
        actionSelect.disabled = true;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Select Player First';
        actionSelect.appendChild(option);
        return;
    }

    actionSelect.disabled = false;

    // --- MATCH MODE ---
    if (playerId === '__MATCH__') {
        const allActions = new Set(gameMoments.map(m => m.event));
        
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Actions';
        actionSelect.appendChild(allOption);

        // Add "Match Highlights" option if any exist.
        const hasMatchHighlights = gameMoments.some(m => m.inMomentsFile);
        if (hasMatchHighlights) {
            const highlightOption = document.createElement('option');
            highlightOption.value = 'Match Highlights';
            highlightOption.textContent = 'Match Highlights';
            actionSelect.appendChild(highlightOption);
        }

        if (hasMatchHighlights && allActions.size > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '──────────';
            actionSelect.appendChild(separator);
        }

        [...allActions].sort().forEach(action => {
            const option = document.createElement('option');
            option.value = action;
            option.textContent = action;
            actionSelect.appendChild(option);
        });
        
        // Default to "Match Highlights" if they exist.
        if (hasMatchHighlights) {
            actionSelect.value = 'Match Highlights';
        }

        return;
    }

    // --- PLAYER MODE ---
    const playerMoments = gameMoments.filter(moment => moment.id === playerId);
    
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All Actions';
    actionSelect.appendChild(allOption);
    
    const hasHighlights = playerMoments.some(moment => moment.isPlayerHighlight);
    if (hasHighlights) {
        const highlightOption = document.createElement('option');
        highlightOption.value = 'Highlight Reel Moments';
        highlightOption.textContent = 'Highlight Reel Moments';
        actionSelect.appendChild(highlightOption);
    }

    const playerActions = new Set(playerMoments.map(moment => moment.event));
    if (hasHighlights && playerActions.size > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        actionSelect.appendChild(separator);
    }

    if (playerActions.size > 0) {
        [...playerActions].sort().forEach(action => {
            const option = document.createElement('option');
            option.value = action;
            option.textContent = action;
            actionSelect.appendChild(option);
        });
    }

    if (hasHighlights) {
        actionSelect.value = 'Highlight Reel Moments';
    }
}

function updateSelectionSummary() {
    if (!selectionSummary || !playerSelect || !actionSelect) return;

    const selectedPlayer = playerSelect.value;
    const selectedAction = actionSelect.value;

    let summaryHTML = '';

    if (!selectedPlayer) {
        summaryHTML = '<p>No player selected</p>';
    } else {
        const playerMoment = gameMoments.find(m => m.id === selectedPlayer);
        if (!playerMoment) return;

        summaryHTML = `
            <p class="selected-player">Selected Player: ${playerMoment.name} (ID: ${playerMoment.id})</p>
        `;

        if (selectedAction === '') {
            summaryHTML += '<p>No action selected</p>';
        } else {
            summaryHTML += `
                <div class="selected-actions">
                    <p>Selected Action:</p>
                    <div class="actions-container">
                        ${selectedAction}
                    </div>
                </div>
            `;
        }
    }

    selectionSummary.innerHTML = summaryHTML;
}

function updateMomentsList() {
    if (!momentsList) return;

    const selectedPlayer = playerSelect ? playerSelect.value : null;
    const selectedAction = actionSelect ? actionSelect.value : null;
    
    const playAllButton = document.getElementById('playAllButton');

    let filteredMoments = gameMoments;

    // --- MATCH MODE ---
    if (selectedPlayer === '__MATCH__') {
        if (selectedAction) {
            if (selectedAction === 'Match Highlights') {
                filteredMoments = filteredMoments.filter(moment => moment.inMomentsFile);
            } else {
                filteredMoments = filteredMoments.filter(moment => moment.event === selectedAction);
            }
        }
    } else {
        // --- PLAYER MODE ---
        if (!selectedPlayer) {
            momentsList.innerHTML = '<div class="moment-item">Please select a player to see their moments.</div>';
            return;
        }
        filteredMoments = gameMoments.filter(moment => moment.id === selectedPlayer);
        if (selectedAction) {
            if (selectedAction === 'Highlight Reel Moments') {
                filteredMoments = filteredMoments.filter(moment => moment.isPlayerHighlight);
            } else {
                filteredMoments = filteredMoments.filter(moment => moment.event === selectedAction);
            }
        }
    }
    
    // Wire up the "Play All" button to the filtered list of moments.
    if (playAllButton) {
        playAllButton.onclick = () => playAllMoments(filteredMoments);
    }

    momentsList.innerHTML = ''; // Clear current content

    if (filteredMoments.length === 0) {
        momentsList.innerHTML = '<div class="moment-item" style="padding: 15px;">No matching moments found.</div>';
        return;
    }
    
    // Create the table structure
    const table = document.createElement('table');
    table.className = 'moments-table';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>Play</th>
            <th>Player Highlight</th>
            <th>Match Highlight</th>
            <th>Inpoint</th>
            <th>Outpoint</th>
            <th>Event</th>
            <th>Player Details</th>
        </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    filteredMoments.forEach(moment => {
        const tr = document.createElement('tr');
        
        // Play Button Cell
        const playCell = document.createElement('td');
        const playBtn = document.createElement('button');
        playBtn.className = 'play-moment-btn';
        playBtn.textContent = '▶';
        playBtn.onclick = () => playMomentWithOverlay(moment);
        playCell.appendChild(playBtn);
        
        // Player Highlight Checkbox
        const playerHighlightCell = document.createElement('td');
        const playerHighlightCheck = document.createElement('input');
        playerHighlightCheck.type = 'checkbox';
        playerHighlightCheck.className = 'highlight-checkbox';
        playerHighlightCheck.checked = moment.isPlayerHighlight;
        playerHighlightCheck.onchange = () => toggleMomentProperty(moment, 'isPlayerHighlight');
        playerHighlightCell.appendChild(playerHighlightCheck);

        // Match Highlight Checkbox
        const matchHighlightCell = document.createElement('td');
        const matchHighlightCheck = document.createElement('input');
        matchHighlightCheck.type = 'checkbox';
        matchHighlightCheck.className = 'highlight-checkbox';
        matchHighlightCheck.checked = moment.inMomentsFile;
        matchHighlightCheck.onchange = () => toggleMomentProperty(moment, 'inMomentsFile');
        matchHighlightCell.appendChild(matchHighlightCheck);
        
        // Other cells
        const inpointCell = document.createElement('td');
        inpointCell.textContent = moment.inpoint;
        
        const outpointCell = document.createElement('td');
        outpointCell.textContent = moment.outpoint;

        const eventCell = document.createElement('td');
        eventCell.textContent = moment.event;

        const detailsCell = document.createElement('td');
        detailsCell.textContent = `ID: ${moment.id} | Name: ${moment.name} | Manual: ${moment.manual} | Jersey: ${moment.jersey}`;
        
        tr.appendChild(playCell);
        tr.appendChild(playerHighlightCell);
        tr.appendChild(matchHighlightCell);
        tr.appendChild(inpointCell);
        tr.appendChild(outpointCell);
        tr.appendChild(eventCell);
        tr.appendChild(detailsCell);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    momentsList.appendChild(table);
}

// This function is now just a wrapper for the new overlay function.
function playMoment(moment) {
    playMomentWithOverlay(moment);
}

// New function to handle playing a single moment with an overlay.
function playMomentWithOverlay(moment, isSequence = false) {
    return new Promise(async (resolve) => {
        if (!videoPlayer) return resolve();
        
        // --- Scroll to Top ---
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const overlay = document.getElementById('eventOverlay');
        
        // 1. Show the event overlay with player details
        overlay.innerHTML = `
            <div style="font-size: 1em;">${moment.event}</div>
            <div style="font-size: 0.5em; margin-top: 10px; color: #ccc;">${moment.name}</div>
        `;
        overlay.classList.add('visible');
        
        // Wait for 2 seconds
        await new Promise(r => setTimeout(r, 2000));
        
        // 2. Hide the overlay
        overlay.classList.remove('visible');
        
        // Give the fade-out animation time to complete before playing.
        await new Promise(r => setTimeout(r, 500));
        
        // 3. Play the video segment
        const startTime = convertTimestampToSeconds(moment.inpoint);
        const endTime = convertTimestampToSeconds(moment.outpoint);

        videoPlayer.currentTime = startTime;
        await videoPlayer.play();

        const checkTime = setInterval(() => {
            // Stop if the global "Stop" flag has been set.
            if (!isPlayingAll && isSequence) { 
                videoPlayer.pause();
                clearInterval(checkTime);
                return resolve();
            }
            if (videoPlayer.currentTime >= endTime) {
                videoPlayer.pause();
                clearInterval(checkTime);
                resolve(); // Resolve the promise when the segment is done.
            }
        }, 100);
    });
}

// New function to play all filtered moments sequentially.
async function playAllMoments(moments) {
    const playAllButton = document.getElementById('playAllButton');

    if (isPlayingAll) {
        // This means the user clicked "Stop".
        isPlayingAll = false;
        playAllButton.textContent = 'Play All';
        setControlsEnabled(true);
        videoPlayer.pause();
        console.log('"Play All" sequence stopped by user.');
        return;
    }

    isPlayingAll = true;
    playAllButton.textContent = 'Stop';
    setControlsEnabled(false); // Disable other controls.
    console.log(`Starting to play all ${moments.length} moments.`);
    
    for (const moment of moments) {
        if (!isPlayingAll) break; // Exit loop if "Stop" was clicked.
        console.log(`Playing moment: ${moment.event}`);
        await playMomentWithOverlay(moment, true); // Pass a flag to indicate it's part of a sequence.
        if (!isPlayingAll) break;
        await new Promise(r => setTimeout(r, 1000)); // Delay between moments.
    }
    
    if (isPlayingAll) {
        // This means the sequence completed normally.
        isPlayingAll = false;
        playAllButton.textContent = 'Play All';
        setControlsEnabled(true);
        console.log('Finished playing all moments.');
    }
}

// Helper function to enable/disable controls during "Play All".
function setControlsEnabled(enabled) {
    const shield = document.getElementById('videoSeekShield');
    if (shield) {
        shield.style.display = enabled ? 'none' : 'block';
    }

    // Disable/enable dropdowns
    if (playerSelect) playerSelect.disabled = !enabled;
    if (actionSelect) actionSelect.disabled = !enabled;

    // Disable/enable individual play buttons
    const playButtons = document.querySelectorAll('.play-moment-btn');
    playButtons.forEach(btn => btn.disabled = !enabled);
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    initializeVideoPlayer();
});

document.getElementById('uploadGameInfoButton').addEventListener('click', () => {
    document.getElementById('gameInfoZipInput').click();
});

document.getElementById('gameInfoZipInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    const statusEl = document.getElementById('zipUploadStatus');
    statusEl.classList.remove('visible');

    if (!file) return;

    // Reset data on new upload
    player360Data = null;
    player360Videos = {};
    player360Thumbnails = {};

    try {
        const zip = await JSZip.loadAsync(file);
        console.log('Files in zip:', Object.keys(zip.files));
        
        // Find players.csv, allowing it to be in a subdirectory and ignoring macOS resource forks
        let playersCsvFileArr = zip.file(/players\.csv$/i);
        // Filter out macOS resource fork files.
        playersCsvFileArr = playersCsvFileArr.filter(file => !file.name.split('/').pop().startsWith('._'));

        if (playersCsvFileArr.length === 0) {
            throw new Error('players.csv not found in the zip file.');
        }
        if (playersCsvFileArr.length > 1) {
            console.warn('Multiple players.csv files found, using the first one:', playersCsvFileArr[0].name);
        }
        
        const playersCsvFile = playersCsvFileArr[0];
        console.log('Using players.csv from:', playersCsvFile.name);
        const basePath = playersCsvFile.name.substring(0, playersCsvFile.name.lastIndexOf('/') + 1);
        console.log('Determined base path:', basePath);

        const playersCsv = await playersCsvFile.async('string');
        const players = parseCSV(playersCsv);
        player360Data = players;

        // Process 360 videos and thumbnails based on the CSV mapping
        for (const player of players) {
            if (player.video_360_filename && player.video_360_filename.trim()) {
                const videoPath = `${basePath}player_360_videos/${player.video_360_filename.trim()}`;
                const videoFile = zip.file(videoPath);
                if (videoFile) {
                    console.log('Found video file:', videoFile.name);
                    const videoBlob = await videoFile.async('blob');
                    console.log(`Blob for ${player.player_id}:`, videoBlob.size, videoBlob.type);
                    player360Videos[player.player_id] = URL.createObjectURL(videoBlob);
                } else {
                    console.warn(`Video file not found in zip: ${videoPath}`);
                }
            }
            
            if (player.thumbnail_filename && player.thumbnail_filename.trim()) {
                const thumbnailPath = `${basePath}player_360_thumbnails/${player.thumbnail_filename.trim()}`;
                const thumbnailFile = zip.file(thumbnailPath);
                if (thumbnailFile) {
                    const thumbnailBlob = await thumbnailFile.async('blob');
                    player360Thumbnails[player.player_id] = URL.createObjectURL(thumbnailBlob);
                } else {
                    console.warn(`Thumbnail file not found in zip: ${thumbnailPath}`);
                }
            }
        }

        // Trigger a change on player select to refresh view if a player is already selected
        document.getElementById('playerSelect').dispatchEvent(new Event('change'));
        showUploadStatus('✓ Success', 'success', 3000, 'zipUploadStatus');

    } catch (error) {
        console.error('Error processing zip file:', error);
        showUploadStatus(error.message, 'error', null, 'zipUploadStatus');
    }
});

function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
            return obj;
        }, {});
    });
}

// Modify the existing player selection handler to include 360 view
const originalPlayerSelectHandler = document.getElementById('playerSelect').onchange;
document.getElementById('playerSelect').onchange = function(event) {
    // Call the original handler first
    if (originalPlayerSelectHandler) {
        originalPlayerSelectHandler.call(this, event);
    }

    const selectedPlayerId = event.target.value;
    if (!selectedPlayerId) {
        document.getElementById('player360VideoPlayerContainer').innerHTML = 
            '<div class="video-placeholder-text">Player 360° view will appear here.</div>';
        return;
    }

    // Find matching player in 360 data
    const matchingPlayer = player360Data?.find(p => p.player_id === selectedPlayerId);
    
    if (matchingPlayer) {
        // Update manual ID display
        document.getElementById('player360ManualIdDisplay').textContent = 
            `Manual ID: ${matchingPlayer.manual_id}`;

        // Update 360 view based on selected mode
        const viewMode = document.querySelector('input[name="player360ViewMode"]:checked').value;
        update360View(selectedPlayerId, viewMode);
    } else {
        document.getElementById('player360VideoPlayerContainer').innerHTML = 
            '<div class="video-placeholder-text">No 360° content available for this player.</div>';
        document.getElementById('player360ManualIdDisplay').textContent = '';
    }
};

// Handle 360 view mode changes
document.querySelectorAll('input[name="player360ViewMode"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
        const selectedPlayerId = document.getElementById('playerSelect').value;
        if (selectedPlayerId) {
            update360View(selectedPlayerId, event.target.value);
        }
    });
});

function update360View(playerId, mode) {
    const container = document.getElementById('player360VideoPlayerContainer');
    // Clear the container
    container.innerHTML = '';

    if (mode === 'video' && player360Videos[playerId]) {
        console.log('Attempting to play video for', playerId, 'from URL:', player360Videos[playerId]);

        const videoElement = document.createElement('video');
        videoElement.id = 'player360Video';
        videoElement.controls = true;
        videoElement.autoplay = true;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true; // Use property for JS
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'contain';
        videoElement.style.position = 'absolute';
        videoElement.style.top = '0';
        videoElement.style.left = '0';
        // Add max-width/height for robustness against browser quirks
        videoElement.style.maxWidth = '100%';
        videoElement.style.maxHeight = '100%';

        const sourceElement = document.createElement('source');
        sourceElement.src = player360Videos[playerId];
        // .mov files often contain H.264 video. 'video/mp4' is a more universally
        // supported MIME type that might work better than 'video/quicktime'.
        sourceElement.type = 'video/mp4'; 

        videoElement.appendChild(sourceElement);
        videoElement.appendChild(document.createTextNode('Your browser does not support the video tag.'));
        container.appendChild(videoElement);

        // --- Extensive Video Debugging ---
        const events = ['loadstart', 'progress', 'suspend', 'abort', 'error', 'emptied', 'stalled', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'waiting', 'seeking', 'seeked', 'ended', 'durationchange', 'timeupdate', 'play', 'pause'];
        events.forEach(event => {
            videoElement.addEventListener(event, () => {
                console.log(`[Video Event: ${playerId}] - ${event.toUpperCase()}`);
            });
        });

        videoElement.onerror = () => {
            const error = videoElement.error;
            console.error(`[Video Error: ${playerId}]`, error, `ReadyState: ${videoElement.readyState}`, `NetworkState: ${videoElement.networkState}`);
            container.innerHTML = `<div class="video-placeholder-text">Error playing video. Code: ${error.code}, Message: ${error.message}</div>`;
        };

        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === 'AbortError') {
                    console.log(`Play for ${playerId} was interrupted, likely by a new selection.`);
                } else {
                    console.error(`Autoplay for ${playerId} was prevented:`, error);
                }
            });
        }

    } else if (mode === 'thumbnail' && player360Thumbnails[playerId]) {
        container.innerHTML = `
            <img src="${player360Thumbnails[playerId]}" 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;">
        `;
    } else {
        container.innerHTML = `
            <div class="video-placeholder-text">
                No ${mode} available for this player.
            </div>
        `;
    }
}

function showUploadStatus(message, type, duration = 3000, elementId = 'zipUploadStatus') {
    const statusEl = document.getElementById(elementId);
    statusEl.textContent = message;
    statusEl.className = `upload-status visible ${type}`;

    if (duration) {
        setTimeout(() => {
            statusEl.classList.remove('visible');
        }, duration);
    }
}

// New, more generic function to toggle a boolean property of a moment.
function toggleMomentProperty(momentToToggle, propertyToToggle) {
    // Find the moment in our main data source and update its state.
    const masterMoment = gameMoments.find(m => 
        m.id === momentToToggle.id &&
        m.inpoint === momentToToggle.inpoint &&
        m.event === momentToToggle.event
    );

    if (masterMoment) {
        masterMoment[propertyToToggle] = !masterMoment[propertyToToggle];
        console.log(`Toggled ${propertyToToggle} for ${masterMoment.name}'s ${masterMoment.event} to ${masterMoment[propertyToToggle]}`);
        
        // After toggling, we must refresh the action dropdown for the current player
        // as a highlight option may need to appear or disappear.
        const selectedPlayer = playerSelect ? playerSelect.value : null;
        if (selectedPlayer) {
            const currentAction = actionSelect.value;
            updateActionSelect(selectedPlayer);
            actionSelect.value = currentAction;
        }

        updateMomentsList();

    } else {
        console.error('Could not find the master moment to toggle.');
    }
}