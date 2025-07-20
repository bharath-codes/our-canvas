window.addEventListener('load', () => {
    const socket = io(); // Connect to the server

    // Select all elements
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

    // State variables
    let isDrawing = false;
    let isErasing = false;
    let lastX = 0, lastY = 0;
    let currentColor = '#000000';
    let currentBrushSize = brushSizeSlider.value;

    function draw(x0, y0, x1, y1, color, size, op) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = op;
        ctx.stroke();
    }

    function handleMouseMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCanvasCoordinates(e);

        const data = {
            x0: lastX, y0: lastY,
            x1: x, y1: y,
            color: currentColor,
            size: currentBrushSize,
            op: isErasing ? 'destination-out' : 'source-over'
        };

        draw(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.op);
        socket.emit('drawing', data); // Send drawing data to server

        [lastX, lastY] = [x, y];
    }
    
    function clearLocalCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    function handleClearClick() {
        clearLocalCanvas();
        socket.emit('clear'); // Tell server to clear everyone's canvas
    }
    
    // Listen for events from the server
    socket.on('drawing', (data) => {
        draw(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.op);
    });
    
    socket.on('clear', clearLocalCanvas);

    // --- All other helper functions and listeners ---
    function activatePen() { isErasing = false; penBtn.classList.add('selected'); eraserBtn.classList.remove('selected'); colorTools.classList.remove('disabled'); }
    function activateEraser() { isErasing = true; eraserBtn.classList.add('selected'); penBtn.classList.remove('selected'); colorTools.classList.add('disabled'); }
    function startDrawing(e) { isDrawing = true; const { x, y } = getCanvasCoordinates(e);[lastX, lastY] = [x, y]; }
    function stopDrawing() { isDrawing = false; ctx.beginPath(); }
    function getCanvasCoordinates(event) {
        const rect = canvas.getBoundingClientRect();
        if (event.touches) { return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top }; }
        return { x: event.offsetX, y: event.offsetY };
    }
    function saveCanvas() { const dataURL = canvas.toDataURL('image/png'); const link = document.createElement('a'); link.href = dataURL; link.download = 'our-canvas.png'; link.click(); }
    
    penBtn.addEventListener('click', activatePen);
    eraserBtn.addEventListener('click', activateEraser);
    colorSwatches.forEach(swatch => { swatch.style.backgroundColor = swatch.dataset.color; swatch.addEventListener('click', () => { currentColor = swatch.dataset.color; activatePen(); }); });
    colorPicker.addEventListener('input', (e) => { currentColor = e.target.value; activatePen(); });
    brushSizeSlider.addEventListener('input', (e) => { currentBrushSize = e.target.value; brushSizeDisplay.textContent = e.target.value; });
    clearBtn.addEventListener('click', handleClearClick);
    saveBtn.addEventListener('click', saveCanvas);
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', handleMouseMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
});