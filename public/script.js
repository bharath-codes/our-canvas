window.addEventListener('load', () => {
    // --- SETUP ---
    const socket = io("https://our-canvas.onrender.com"); // Your Render URL
    const canvasContainer = document.querySelector('#canvas-container');
    const cursorsContainer = document.querySelector('#cursors-container');
    const userCursors = {}; // To store other users' cursor elements

    // Ask for the user's name
    const userName = prompt("What's your name?", "Guest");
    document.querySelector('.header p').textContent = `Welcome, ${userName}!`; // Personalize the welcome message

    // Tell the server we've connected
    socket.on('connect', () => {
        socket.emit('userConnected', userName);
    });

    // --- All the drawing-related code is the same ---
    // (Copied here for a complete file)
    const canvas = document.querySelector('#drawing-canvas');
    const ctx = canvas.getContext('2d');
    const penBtn = document.querySelector('#pen-btn');
    const eraserBtn = document.querySelector('#eraser-btn');
    const colorTools = document.querySelector('#color-tools');
    const colorSwatches = document.querySelectorAll('.color-swatch');
    const colorPicker = document.querySelector('#color-picker');
    const brushSizeSlider = document.querySelector('#brush-size');
    const brushSizeDisplay = document.querySelector('#brush-size-display');
    const clearBtn = document.querySelector('#clear-btn');
    const saveBtn = document.querySelector('#save-btn');

    let isDrawing = false, isErasing = false, lastX = 0, lastY = 0;
    let currentColor = '#000000', currentBrushSize = brushSizeSlider.value;

    function draw(x0, y0, x1, y1, color, size, op) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        ctx.strokeStyle = color; ctx.lineWidth = size;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = op; ctx.stroke();
    }

    function handleMouseMove(e) {
        if (!isDrawing) return; e.preventDefault();
        const { x, y } = getCanvasCoordinates(e);
        const data = { x0: lastX, y0: lastY, x1: x, y1: y, color: currentColor, size: currentBrushSize, op: isErasing ? 'destination-out' : 'source-over' };
        draw(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.op);
        socket.emit('drawing', data);
        [lastX, lastY] = [x, y];
    }

    // ... (all the other drawing functions are the same)
    function clearLocalCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    function handleClearClick() { clearLocalCanvas(); socket.emit('clear'); }
    function activatePen() { isErasing = false; penBtn.classList.add('selected'); eraserBtn.classList.remove('selected'); colorTools.classList.remove('disabled'); }
    function activateEraser() { isErasing = true; eraserBtn.classList.add('selected'); penBtn.classList.remove('selected'); colorTools.classList.add('disabled'); }
    function startDrawing(e) { isDrawing = true; const { x, y } = getCanvasCoordinates(e);[lastX, lastY] = [x, y]; }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }
    function getCanvasCoordinates(event) {
        const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        let clientX, clientY;
        if (event.touches) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
        else { clientX = event.clientX; clientY = event.clientY; }
        const x = (clientX - rect.left) * scaleX; const y = (clientY - rect.top) * scaleY;
        return { x, y };
    }
    function saveCanvas() { const dataURL = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.href = dataURL; link.download = 'our-canvas.png'; link.click(); }

    // --- NEW: CURSOR LOGIC ---

    // Send our cursor position to the server
    canvasContainer.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        socket.emit('cursorMove', { x, y });
    });

    // Listen for user list updates
    socket.on('updateUsers', (users) => {
        // First, remove any cursors for users who have disconnected
        Object.keys(userCursors).forEach(id => {
            if (!users[id]) {
                userCursors[id].remove();
                delete userCursors[id];
            }
        });

        // Then, add/update cursors for all current users
        Object.keys(users).forEach(id => {
            if (id === socket.id) return; // Don't draw our own cursor

            if (!userCursors[id]) {
                // Create a new cursor element if it doesn't exist
                const cursorEl = document.createElement('div');
                cursorEl.className = 'user-cursor';
                cursorEl.innerHTML = `<i class="fa-solid fa-mouse-pointer cursor-icon"></i><span class="cursor-name">${users[id].name}</span>`;
                userCursors[id] = cursorEl;
                cursorsContainer.appendChild(cursorEl);
            }
            // Update the name in case it changed (less likely, but good practice)
            userCursors[id].querySelector('.cursor-name').textContent = users[id].name;
        });
    });

    // Listen for cursor movements from other users
    socket.on('cursorMoved', (data) => {
        if (userCursors[data.id]) {
            userCursors[data.id].style.left = `${data.x}px`;
            userCursors[data.id].style.top = `${data.y}px`;
        }
    });

    // Listen for a user disconnecting
    socket.on('userDisconnected', (id) => {
        if (userCursors[id]) {
            userCursors[id].remove();
            delete userCursors[id];
        }
    });

    // --- EVENT LISTENERS (Same as before) ---
    penBtn.addEventListener('click', activatePen); eraserBtn.addEventListener('click', activateEraser);
    colorSwatches.forEach(swatch => { swatch.style.backgroundColor = swatch.dataset.color; swatch.addEventListener('click', () => { currentColor = swatch.dataset.color; activatePen(); }); });
    colorPicker.addEventListener('input', (e) => { currentColor = e.target.value; activatePen(); });
    brushSizeSlider.addEventListener('input', (e) => { currentBrushSize = e.target.value; brushSizeDisplay.textContent = e.target.value; });
    clearBtn.addEventListener('click', handleClearClick); saveBtn.addEventListener('click', saveCanvas);
    canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false }); canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
});