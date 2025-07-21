window.addEventListener('load', () => {
    // --- SETUP ---
    const socket = io("https://our-canvas.onrender.com"); // Your Render URL

    const canvasContainer = document.querySelector('#canvas-container');
    const cursorsContainer = document.querySelector('#cursors-container');
    const userCursors = {};

    const userName = prompt("What's your name?", "Guest");
    if (userName) { document.querySelector('.header p').textContent = `Welcome, ${userName}!`; }

    socket.on('connect', () => {
        socket.emit('userConnected', userName || 'Guest');
    });

    // --- ELEMENT SELECTION ---
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
    
    const chatForm = document.querySelector('#chat-form');
    const chatInput = document.querySelector('#chat-input');
    const chatMessages = document.querySelector('#chat-messages');

    // --- STATE VARIABLES ---
    let isDrawing = false, isErasing = false, lastX = 0, lastY = 0;
    let currentColor = '#000000', currentBrushSize = brushSizeSlider.value;
    
    // --- CHAT LOGIC ---
    function addMessageToUI(sender, message, isMe = false) {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${sender}:</strong> ${message}`;
        if (isMe) { item.classList.add('my-message'); }
        chatMessages.appendChild(item);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (chatInput.value) {
            const msg = chatInput.value;
            addMessageToUI(userName || "Me", msg, true);
            socket.emit('chatMessage', msg);
            chatInput.value = '';
        }
    });

    socket.on('chatMessage', (data) => {
        addMessageToUI(data.name, data.message);
    });

    // --- CORE DRAWING FUNCTIONS ---
    function draw(x0, y0, x1, y1, color, size, op) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = op; ctx.stroke(); }
    function handleMouseMove(e) { if (!isDrawing) return; e.preventDefault(); const { x, y } = getCanvasCoordinates(e); const localOp = isErasing ? 'destination-out' : 'source-over'; draw(lastX, lastY, x, y, currentColor, currentBrushSize, localOp); const w = canvas.width; const h = canvas.height; const data = { x0: lastX / w, y0: lastY / h, x1: x / w, y1: y / h, color: currentColor, size: currentBrushSize, op: localOp }; socket.emit('drawing', data);[lastX, lastY] = [x, y]; }
    socket.on('drawing', (data) => { const w = canvas.width; const h = canvas.height; draw(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, data.op); });
    
    // --- CURSOR LOGIC ---
    function handleCursorMove(e) { if (e.touches) { e.preventDefault(); } const rect = canvas.getBoundingClientRect(); let clientX, clientY; if (e.touches) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } else { clientX = e.clientX; clientY = e.clientY; } const x = clientX - rect.left; const y = clientY - rect.top; socket.emit('cursorMove', { x, y }); }
    canvasContainer.addEventListener('mousemove', handleCursorMove); canvasContainer.addEventListener('touchmove', handleCursorMove, { passive: false });
    socket.on('updateUsers', (users) => { Object.keys(userCursors).forEach(id => { if (!users[id]) { userCursors[id].remove(); delete userCursors[id]; } }); Object.keys(users).forEach(id => { if (id === socket.id) return; if (!userCursors[id]) { const cursorEl = document.createElement('div'); cursorEl.className = 'user-cursor'; cursorEl.innerHTML = `<i class="fa-solid fa-mouse-pointer cursor-icon"></i><span class="cursor-name"></span>`; userCursors[id] = cursorEl; cursorsContainer.appendChild(cursorEl); } userCursors[id].querySelector('.cursor-name').textContent = users[id].name; }); });
    socket.on('cursorMoved', (data) => { if (userCursors[data.id]) { userCursors[data.id].style.left = `${data.x}px`; userCursors[data.id].style.top = `${data.y}px`; } });
    socket.on('userDisconnected', (id) => { if (userCursors[id]) { userCursors[id].remove(); delete userCursors[id]; } });
    
    // --- HELPER FUNCTIONS & EVENT LISTENERS ---
    function clearLocalCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    function handleClearClick() { clearLocalCanvas(); socket.emit('clear'); }
    socket.on('clear', clearLocalCanvas);
    function activatePen() { isErasing = false; penBtn.classList.add('selected'); eraserBtn.classList.remove('selected'); colorTools.classList.remove('disabled'); }
    function activateEraser() { isErasing = true; eraserBtn.classList.add('selected'); penBtn.classList.remove('selected'); colorTools.classList.add('disabled'); }
    function startDrawing(e) { isDrawing = true; const { x, y } = getCanvasCoordinates(e);[lastX, lastY] = [x, y]; }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }
    function getCanvasCoordinates(event) { const rect = canvas.getBoundingClientRect(); const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height; let clientX, clientY; if (event.touches) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; } else { clientX = event.clientX; clientY = event.clientY; } const x = (clientX - rect.left) * scaleX; const y = (clientY - rect.top) * scaleY; return { x, y }; }
    function saveCanvas() { const dataURL = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.href = dataURL; link.download = 'our-canvas.png'; link.click(); }
    
    penBtn.addEventListener('click', activatePen);
    eraserBtn.addEventListener('click', activateEraser);
    colorSwatches.forEach(swatch => { swatch.style.backgroundColor = swatch.dataset.color; swatch.addEventListener('click', () => { currentColor = swatch.dataset.color; activatePen(); }); });
    colorPicker.addEventListener('input', (e) => { currentColor = e.target.value; activatePen(); });
    
    // THIS IS THE CORRECTED LINE
    brushSizeSlider.addEventListener('input', (e) => {
        currentBrushSize = e.target.value;
        brushSizeDisplay.textContent = e.target.value;
    });

    clearBtn.addEventListener('click', handleClearClick);
    saveBtn.addEventListener('click', saveCanvas);
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', handleMouseMove);
    canvas.addEventListener('touchend', stopDrawing);
});