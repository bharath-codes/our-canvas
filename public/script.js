window.addEventListener('load', () => {
    // --- SETUP ---
    const socket = io("https://our-canvas.onrender.com"); // IMPORTANT: Use your actual Render URL
    // ... (rest of setup is the same)
    const canvasContainer = document.querySelector('#canvas-container');
    const cursorsContainer = document.querySelector('#cursors-container');
    const userCursors = {};

    const userName = prompt("What's your name?", "Guest");
    if (userName) { document.querySelector('.header p').textContent = `Welcome, ${userName}!`; }

    socket.on('connect', () => {
        socket.emit('userConnected', userName || 'Guest');
    });

    // --- ELEMENT SELECTION (with new doodle buttons) ---
    const canvas = document.querySelector('#drawing-canvas');
    const ctx = canvas.getContext('2d');
    const penBtn = document.querySelector('#pen-btn');
    const eraserBtn = document.querySelector('#eraser-btn');
    const doodleBtns = document.querySelectorAll('.doodle-btn'); // New
    const colorTools = document.querySelector('#color-tools');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const colorPicker = document.querySelector('#color-picker');
    const brushSizeSlider = document.querySelector('#brush-size');
    const brushSizeDisplay = document.querySelector('#brush-size-display');
    const clearBtn = document.querySelector('#clear-btn');
    const saveBtn = document.querySelector('#save-btn');

    // --- STATE VARIABLES (with new doodle state) ---
    let isDrawing = false, isErasing = false, lastX = 0, lastY = 0;
    let isDoodleMode = false; // New
    let currentDoodle = '';   // New
    let currentColor = '#000000', currentBrushSize = brushSizeSlider.value;

    // --- CORE DRAWING & DOODLE FUNCTIONS ---
    function drawLine(x0, y0, x1, y1, color, size, op) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = color; ctx.lineWidth = size;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = op; ctx.stroke();
    }

    // NEW: Function to draw a doodle
    function drawDoodle(x, y, doodle, color, size) {
        ctx.fillStyle = color;
        ctx.font = `${size * 3}px sans-serif`; // Use brush size to control doodle size
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalCompositeOperation = 'source-over'; // Always draw doodles on top
        ctx.fillText(doodle, x, y);
    }

    // --- MOUSE/TOUCH HANDLERS & SOCKET EMITTERS ---
    function handleLineMove(e) {
        if (!isDrawing) return; e.preventDefault();
        const { x, y } = getCanvasCoordinates(e);
        const localOp = isErasing ? 'destination-out' : 'source-over';
        drawLine(lastX, lastY, x, y, currentColor, currentBrushSize, localOp);
        const w = canvas.width; const h = canvas.height;
        const data = { x0: lastX / w, y0: lastY / h, x1: x / w, y1: y / h, color: currentColor, size: currentBrushSize, op: localOp };
        socket.emit('drawing', data);
        [lastX, lastY] = [x, y];
    }
    
    // NEW: Handle clicks for stamping doodles
    function handleCanvasClick(e) {
        if (!isDoodleMode) return;
        const { x, y } = getCanvasCoordinates(e);
        
        // Draw doodle locally
        drawDoodle(x, y, currentDoodle, currentColor, currentBrushSize);
        
        // Send doodle data to server
        const w = canvas.width; const h = canvas.height;
        const data = { x: x / w, y: y / h, doodle: currentDoodle, color: currentColor, size: currentBrushSize };
        socket.emit('doodle', data);
    }
    
    // --- SOCKET LISTENERS ---
    socket.on('drawing', (data) => {
        const w = canvas.width; const h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, data.op);
    });

    // NEW: Listen for doodles from others
    socket.on('doodle', (data) => {
        const w = canvas.width; const h = canvas.height;
        drawDoodle(data.x * w, data.y * h, data.doodle, data.color, data.size);
    });

    // ... (All cursor and other listeners are the same)
    function handleCursorMove(e) { /* ... same as before ... */ }
    canvasContainer.addEventListener('mousemove', handleCursorMove); canvasContainer.addEventListener('touchmove', handleCursorMove, { passive: false });
    socket.on('updateUsers', (users) => { /* ... same as before ... */ });
    socket.on('cursorMoved', (data) => { /* ... same as before ... */ });
    socket.on('userDisconnected', (id) => { /* ... same as before ... */ });
    function clearLocalCanvas() { /* ... same as before ... */ }
    function handleClearClick() { /* ... same as before ... */ }
    socket.on('clear', clearLocalCanvas);

    // --- ACTIVATION FUNCTIONS ---
    function activatePen() {
        isErasing = false; isDoodleMode = false;
        penBtn.classList.add('selected');
        eraserBtn.classList.remove('selected');
        doodleBtns.forEach(b => b.classList.remove('selected'));
        colorTools.classList.remove('disabled');
    }
    function activateEraser() {
        isErasing = true; isDoodleMode = false;
        eraserBtn.classList.add('selected');
        penBtn.classList.remove('selected');
        doodleBtns.forEach(b => b.classList.remove('selected'));
        colorTools.classList.add('disabled');
    }
    // NEW: Function to activate doodle mode
    function activateDoodleMode(btn) {
        isErasing = false; isDoodleMode = true;
        currentDoodle = btn.dataset.doodle;
        btn.classList.add('selected');
        penBtn.classList.remove('selected');
        eraserBtn.classList.remove('selected');
        doodleBtns.forEach(b => { if(b !== btn) b.classList.remove('selected'); });
        colorTools.classList.remove('disabled');
    }

    // ... (All other helper functions are here for completeness)
    function startDrawing(e) { isDrawing = true; const { x, y } = getCanvasCoordinates(e);[lastX, lastY] = [x, y]; }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }
    function getCanvasCoordinates(event) { const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; let clientX, clientY; if (event.touches) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; } else { clientX = event.clientX; clientY = event.clientY; } const x = (clientX - rect.left) * scaleX; const y = (clientY - rect.top) * scaleY; return { x, y }; }
    function saveCanvas() { const dataURL = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.href = dataURL; link.download = 'our-canvas.png'; link.click(); }

    // --- FINAL EVENT LISTENERS ---
    
    // Setup Doodle Buttons
    doodleBtns.forEach(btn => {
        btn.textContent = btn.dataset.doodle; // Put the emoji in the button
        btn.addEventListener('click', () => activateDoodleMode(btn));
    });

    // Add new click listener for doodles
    canvas.addEventListener('click', handleCanvasClick);
    
    // Existing Listeners
    penBtn.addEventListener('click', activatePen); eraserBtn.addEventListener('click', activateEraser);
    colorSwatches.forEach(swatch => { swatch.style.backgroundColor = swatch.dataset.color; swatch.addEventListener('click', () => { currentColor = swatch.dataset.color; activatePen(); }); });
    colorPicker.addEventListener('input', (e) => { currentColor = e.target.value; activatePen(); });
    brushSizeSlider.addEventListener('input', (e) => { currentBrushSize = e.target.value; brushSizeDisplay.textContent = e.target.value; });
    clearBtn.addEventListener('click', handleClearClick); saveBtn.addEventListener('click', saveCanvas);
    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', handleLineMove);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false }); canvas.addEventListener('touchmove', handleLineMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    // --- Need to re-paste these functions for the complete file to work ---
    socket.on('updateUsers', (users) => {
        Object.keys(userCursors).forEach(id => { if (!users[id]) { userCursors[id].remove(); delete userCursors[id]; } });
        Object.keys(users).forEach(id => {
            if (id === socket.id) return;
            if (!userCursors[id]) {
                const cursorEl = document.createElement('div');
                cursorEl.className = 'user-cursor';
                cursorEl.innerHTML = `<i class="fa-solid fa-mouse-pointer cursor-icon"></i><span class="cursor-name"></span>`;
                userCursors[id] = cursorEl; cursorsContainer.appendChild(cursorEl);
            }
            userCursors[id].querySelector('.cursor-name').textContent = users[id].name;
        });
    });
    socket.on('cursorMoved', (data) => { if (userCursors[data.id]) { userCursors[data.id].style.left = `${data.x}px`; userCursors[data.id].style.top = `${data.y}px`; } });
    socket.on('userDisconnected', (id) => { if (userCursors[id]) { userCursors[id].remove(); delete userCursors[id]; } });
});