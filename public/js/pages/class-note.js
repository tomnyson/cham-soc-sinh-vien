/**
 * Class Note Board - AutoDraw-style layout (no AI)
 * Local-only persistence per class via localStorage.
 */

const STORAGE_PREFIX = 'class_note_v1_';
const NOTE_VERSION = 1;
const AUTOSAVE_DELAY_MS = 700;
const HISTORY_LIMIT = 100;

const pageEl = document.getElementById('classNotePage');

if (pageEl) {
    const serverData = window.__INITIAL_SERVER_DATA__ || {};
    const classNoteData = serverData.classNote || {};
    const classId = String(pageEl.dataset.classId || classNoteData.classId || '').trim();

    const elements = {
        page: pageEl,
        canvasWrap: document.getElementById('noteCanvasWrap'),
        canvas: document.getElementById('noteCanvas'),
        status: document.getElementById('noteStatus'),
        colorInput: document.getElementById('noteColorInput'),
        sizeInput: document.getElementById('noteSizeInput'),
        sizeValue: document.getElementById('noteSizeValue'),
        undoBtn: document.getElementById('noteUndoBtn'),
        redoBtn: document.getElementById('noteRedoBtn'),
        clearBtn: document.getElementById('noteClearBtn'),
        exportBtn: document.getElementById('noteExportBtn'),
        presentBtn: document.getElementById('notePresentBtn'),
        toolButtons: Array.from(document.querySelectorAll('.class-note-tool-btn'))
    };

    const state = {
        classId,
        storageKey: `${STORAGE_PREFIX}${classId}`,
        tool: 'pen',
        color: '#2f6fed',
        size: 4,
        objects: [],
        history: {
            past: [],
            future: []
        },
        viewState: {
            offsetX: 0,
            offsetY: 0
        },
        selectedObjectId: null,
        drawSession: {
            active: false,
            pointerId: null,
            points: []
        },
        shapeSession: {
            active: false,
            pointerId: null,
            shapeType: null,
            startWorldX: 0,
            startWorldY: 0,
            currentWorldX: 0,
            currentWorldY: 0
        },
        objectDragSession: {
            active: false,
            pointerId: null,
            objectId: null,
            startWorldX: 0,
            startWorldY: 0,
            baseObjectX: 0,
            baseObjectY: 0,
            historyCommitted: false,
            moved: false
        },
        textInputSession: {
            active: false,
            editorEl: null,
            mode: null,
            objectId: null,
            worldX: 0,
            worldY: 0,
            baseText: '',
            color: '#2f6fed',
            size: 18
        },
        panSession: {
            active: false,
            pointerId: null,
            startClientX: 0,
            startClientY: 0,
            baseOffsetX: 0,
            baseOffsetY: 0
        },
        saveTimer: null,
        isPresenting: false,
        ctx: null,
        canvasSize: {
            width: 0,
            height: 0,
            dpr: 1
        }
    };

    init();

    function init() {
        if (!classId || !elements.canvas || !elements.canvasWrap) {
            setStatus('Khong the khoi tao note bang cho lop nay.', 'error');
            return;
        }

        bindEvents();
        restoreFromLocalStorage();
        updateToolUI();
        updateSizeUI();
        resizeCanvas();
        render();
    }

    function bindEvents() {
        elements.toolButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const nextTool = button.dataset.tool;
                if (!nextTool) return;
                setTool(nextTool);
            });
        });

        if (elements.colorInput) {
            elements.colorInput.addEventListener('input', (event) => {
                state.color = String(event.target.value || '#2f6fed');
                scheduleSave();
            });
        }

        if (elements.sizeInput) {
            const handleSizeChange = (event) => {
                const raw = Number.parseInt(event.target.value, 10);
                state.size = clampNumber(raw, 1, 24, 4);
                updateSizeUI();
                scheduleSave();
            };
            elements.sizeInput.addEventListener('input', handleSizeChange);
            elements.sizeInput.addEventListener('change', handleSizeChange);
        }

        if (elements.undoBtn) {
            elements.undoBtn.addEventListener('click', undo);
        }
        if (elements.redoBtn) {
            elements.redoBtn.addEventListener('click', redo);
        }
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', clearBoard);
        }
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', exportPng);
        }
        if (elements.presentBtn) {
            elements.presentBtn.addEventListener('click', togglePresentMode);
        }

        const canvas = elements.canvas;
        canvas.style.touchAction = 'none';
        canvas.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleViewportResize);
        window.addEventListener('beforeunload', flushAutoSave);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    function handleViewportResize() {
        window.requestAnimationFrame(() => {
            resizeCanvas();
            if (state.textInputSession.active && state.textInputSession.editorEl) {
                positionInlineTextEditor(
                    state.textInputSession.editorEl,
                    { x: state.textInputSession.worldX, y: state.textInputSession.worldY },
                    state.textInputSession.size
                );
            }
            render();
        });
    }

    function handlePointerDown(event) {
        if (!elements.canvas) return;
        if (!isPrimaryPointer(event)) return;

        event.preventDefault();

        const canvasPoint = getCanvasPoint(event);
        if (!canvasPoint) return;

        if (state.textInputSession.active) {
            finishTextInput({ commit: true, silent: true });
        }

        if (state.tool === 'text') {
            const hitText = findTextAtCanvasPoint(canvasPoint);
            if (hitText) {
                selectObjectById(hitText.id);
                startTextInputForObject(hitText);
                return;
            }
            clearObjectSelection();
            placeText(canvasPoint);
            return;
        }

        if (state.tool === 'pan') {
            const hitObject = findMovableObjectAtCanvasPoint(canvasPoint);
            if (hitObject) {
                selectObjectById(hitObject.id);
                startObjectDrag(event, hitObject, canvasPoint);
                return;
            }

            clearObjectSelection();
            startPan(event);
            render();
            return;
        }

        if (state.tool === 'rect' || state.tool === 'circle') {
            clearObjectSelection();
            startShapeDrawing(event, canvasPoint, state.tool);
            render();
            return;
        }

        clearObjectSelection();
        startDrawing(event, canvasPoint);
        render();
    }

    function handlePointerMove(event) {
        if (state.objectDragSession.active) {
            if (event.pointerId !== state.objectDragSession.pointerId) return;
            const point = getCanvasPoint(event, { allowOutside: true });
            if (!point) return;

            const objectItem = getObjectById(state.objectDragSession.objectId);
            if (!objectItem) {
                finishObjectDrag();
                return;
            }

            const worldPoint = screenToWorld(point);
            const dx = worldPoint.x - state.objectDragSession.startWorldX;
            const dy = worldPoint.y - state.objectDragSession.startWorldY;
            const moveDistance = Math.sqrt((dx * dx) + (dy * dy));

            if (!state.objectDragSession.historyCommitted && moveDistance >= 0.6) {
                commitHistorySnapshot();
                state.objectDragSession.historyCommitted = true;
            }

            if (!state.objectDragSession.historyCommitted) {
                return;
            }

            objectItem.x = roundTo(state.objectDragSession.baseObjectX + dx, 2);
            objectItem.y = roundTo(state.objectDragSession.baseObjectY + dy, 2);
            state.objectDragSession.moved = true;
            render();
            return;
        }

        if (state.shapeSession.active) {
            if (event.pointerId !== state.shapeSession.pointerId) return;
            const point = getCanvasPoint(event, { allowOutside: true });
            if (!point) return;

            const worldPoint = screenToWorld(point);
            state.shapeSession.currentWorldX = worldPoint.x;
            state.shapeSession.currentWorldY = worldPoint.y;
            render();
            return;
        }

        if (state.drawSession.active) {
            if (event.pointerId !== state.drawSession.pointerId) return;
            const point = getCanvasPoint(event);
            if (!point) return;
            appendDrawingPoint(point);
            render();
            return;
        }

        if (state.panSession.active) {
            if (event.pointerId !== state.panSession.pointerId) return;
            const deltaX = event.clientX - state.panSession.startClientX;
            const deltaY = event.clientY - state.panSession.startClientY;
            state.viewState.offsetX = state.panSession.baseOffsetX + deltaX;
            state.viewState.offsetY = state.panSession.baseOffsetY + deltaY;
            updateCursor();
            render();
            scheduleSave();
        }
    }

    function handlePointerUp(event) {
        if (state.objectDragSession.active && event.pointerId === state.objectDragSession.pointerId) {
            finishObjectDrag();
            return;
        }

        if (state.shapeSession.active && event.pointerId === state.shapeSession.pointerId) {
            finishShapeDrawing();
            return;
        }

        if (state.drawSession.active && event.pointerId === state.drawSession.pointerId) {
            finishDrawing();
            return;
        }

        if (state.panSession.active && event.pointerId === state.panSession.pointerId) {
            finishPan();
        }
    }

    function handleKeyDown(event) {
        if (state.textInputSession.active) {
            if (event.key === 'Escape') {
                event.preventDefault();
                cancelTextInput();
                return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                finishTextInput({ commit: true });
                return;
            }
        }

        if (event.defaultPrevented) return;
        const isEditable = isEditableElement(event.target);
        const key = String(event.key || '').toLowerCase();

        // Keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z (redo).
        if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'z' && !isEditable) {
            event.preventDefault();
            if (event.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        }

        if (event.key !== 'Delete' && event.key !== 'Backspace') return;
        if (isEditable) return;
        if (!state.selectedObjectId) return;

        event.preventDefault();
        deleteSelectedObject();
    }

    function startObjectDrag(event, objectItem, canvasPoint) {
        if (!isMovableObject(objectItem)) return;

        const worldPoint = screenToWorld(canvasPoint);

        state.objectDragSession.active = true;
        state.objectDragSession.pointerId = event.pointerId;
        state.objectDragSession.objectId = objectItem.id;
        state.objectDragSession.startWorldX = worldPoint.x;
        state.objectDragSession.startWorldY = worldPoint.y;
        state.objectDragSession.baseObjectX = Number(objectItem.x) || 0;
        state.objectDragSession.baseObjectY = Number(objectItem.y) || 0;
        state.objectDragSession.historyCommitted = false;
        state.objectDragSession.moved = false;

        if (elements.canvas && elements.canvas.setPointerCapture) {
            try {
                elements.canvas.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore capture errors on unsupported devices.
            }
        }

        updateCursor();
        render();
    }

    function finishObjectDrag() {
        if (!state.objectDragSession.active) return;

        const moved = state.objectDragSession.moved;
        const historyCommitted = state.objectDragSession.historyCommitted;
        const objectId = state.objectDragSession.objectId;
        const pointerId = state.objectDragSession.pointerId;

        state.objectDragSession.active = false;
        state.objectDragSession.pointerId = null;
        state.objectDragSession.objectId = null;
        state.objectDragSession.startWorldX = 0;
        state.objectDragSession.startWorldY = 0;
        state.objectDragSession.baseObjectX = 0;
        state.objectDragSession.baseObjectY = 0;
        state.objectDragSession.historyCommitted = false;
        state.objectDragSession.moved = false;

        if (elements.canvas && elements.canvas.releasePointerCapture && pointerId !== null) {
            try {
                elements.canvas.releasePointerCapture(pointerId);
            } catch (error) {
                // Ignore release errors.
            }
        }

        if (moved && historyCommitted) {
            const objectItem = getObjectById(objectId);
            updateUndoRedoButtons();
            scheduleSave();
            if (objectItem && objectItem.type === 'shape') {
                setStatus('Da di chuyen shape.', 'success');
            } else {
                setStatus('Da di chuyen noi dung text.', 'success');
            }
        }

        updateCursor();
        render();
    }

    function startShapeDrawing(event, canvasPoint, shapeType) {
        const worldPoint = screenToWorld(canvasPoint);

        state.shapeSession.active = true;
        state.shapeSession.pointerId = event.pointerId;
        state.shapeSession.shapeType = shapeType;
        state.shapeSession.startWorldX = worldPoint.x;
        state.shapeSession.startWorldY = worldPoint.y;
        state.shapeSession.currentWorldX = worldPoint.x;
        state.shapeSession.currentWorldY = worldPoint.y;

        if (elements.canvas && elements.canvas.setPointerCapture) {
            try {
                elements.canvas.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore capture errors on unsupported devices.
            }
        }
    }

    function finishShapeDrawing() {
        if (!state.shapeSession.active) return;

        const pointerId = state.shapeSession.pointerId;
        const shapeType = state.shapeSession.shapeType;
        const bounds = getShapeBoundsFromPoints(
            state.shapeSession.startWorldX,
            state.shapeSession.startWorldY,
            state.shapeSession.currentWorldX,
            state.shapeSession.currentWorldY
        );

        resetShapeSession();

        if (elements.canvas && elements.canvas.releasePointerCapture && pointerId !== null) {
            try {
                elements.canvas.releasePointerCapture(pointerId);
            } catch (error) {
                // Ignore release errors.
            }
        }

        if (!shapeType || !bounds || bounds.width < 4 || bounds.height < 4) {
            render();
            return;
        }

        commitHistorySnapshot();

        const newShape = {
            id: createObjectId(),
            type: 'shape',
            shape: shapeType,
            x: roundTo(bounds.x, 2),
            y: roundTo(bounds.y, 2),
            width: roundTo(bounds.width, 2),
            height: roundTo(bounds.height, 2),
            color: state.color,
            size: state.size
        };

        state.objects.push(newShape);
        state.selectedObjectId = newShape.id;

        updateUndoRedoButtons();
        updateCursor();
        render();
        scheduleSave();
        setStatus(shapeType === 'circle' ? 'Da them hinh tron.' : 'Da them hinh chu nhat.', 'success');
    }

    function resetShapeSession() {
        state.shapeSession.active = false;
        state.shapeSession.pointerId = null;
        state.shapeSession.shapeType = null;
        state.shapeSession.startWorldX = 0;
        state.shapeSession.startWorldY = 0;
        state.shapeSession.currentWorldX = 0;
        state.shapeSession.currentWorldY = 0;
    }

    function startDrawing(event, canvasPoint) {
        state.drawSession.active = true;
        state.drawSession.pointerId = event.pointerId;
        state.drawSession.points = [screenToWorld(canvasPoint)];

        if (elements.canvas && elements.canvas.setPointerCapture) {
            try {
                elements.canvas.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore capture errors on unsupported devices.
            }
        }

        updateCursor();
    }

    function appendDrawingPoint(canvasPoint) {
        const worldPoint = screenToWorld(canvasPoint);
        const points = state.drawSession.points;
        const lastPoint = points[points.length - 1];

        if (!lastPoint || distance(lastPoint, worldPoint) >= 0.4) {
            points.push(worldPoint);
        }
    }

    function finishDrawing() {
        const points = compactPoints(state.drawSession.points);
        resetDrawSession();

        if (!points.length) {
            render();
            return;
        }

        commitHistorySnapshot();
        state.objects.push({
            id: createObjectId(),
            type: 'path',
            mode: state.tool === 'eraser' ? 'erase' : 'draw',
            color: state.color,
            size: state.size,
            points
        });

        updateUndoRedoButtons();
        render();
        scheduleSave();
        setStatus('Da cap nhat note bang.', 'success');
    }

    function resetDrawSession() {
        state.drawSession.active = false;
        state.drawSession.pointerId = null;
        state.drawSession.points = [];
        updateCursor();
    }

    function startPan(event) {
        state.panSession.active = true;
        state.panSession.pointerId = event.pointerId;
        state.panSession.startClientX = event.clientX;
        state.panSession.startClientY = event.clientY;
        state.panSession.baseOffsetX = state.viewState.offsetX;
        state.panSession.baseOffsetY = state.viewState.offsetY;
        updateCursor();
    }

    function finishPan() {
        state.panSession.active = false;
        state.panSession.pointerId = null;
        updateCursor();
        scheduleSave();
    }

    function placeText(canvasPoint) {
        const worldPoint = screenToWorld(canvasPoint);
        const fontSize = Math.max(14, state.size * 3);
        openTextInput({
            mode: 'new',
            objectId: null,
            worldX: worldPoint.x,
            worldY: worldPoint.y,
            text: '',
            color: state.color,
            size: fontSize
        });
        setStatus('Dang nhap noi dung text.', 'info');
    }

    function startTextInputForObject(objectItem) {
        if (!objectItem || objectItem.type !== 'text') return;

        openTextInput({
            mode: 'edit',
            objectId: objectItem.id,
            worldX: Number(objectItem.x) || 0,
            worldY: Number(objectItem.y) || 0,
            text: String(objectItem.text || ''),
            color: objectItem.color || state.color,
            size: clampNumber(Number(objectItem.size), 10, 120, 18)
        });
    }

    function openTextInput(config) {
        finishTextInput({ commit: true, silent: true });

        const editor = document.createElement('textarea');
        editor.className = 'class-note-inline-text-editor';
        editor.value = String(config.text || '');
        editor.rows = 2;
        editor.spellcheck = false;
        editor.placeholder = 'Nhap text...';
        editor.style.color = config.color || state.color;
        editor.style.fontSize = `${clampNumber(config.size, 10, 120, 18)}px`;

        positionInlineTextEditor(editor, { x: config.worldX, y: config.worldY }, config.size);
        elements.canvasWrap.appendChild(editor);

        state.textInputSession.active = true;
        state.textInputSession.editorEl = editor;
        state.textInputSession.mode = config.mode;
        state.textInputSession.objectId = config.objectId || null;
        state.textInputSession.worldX = Number(config.worldX) || 0;
        state.textInputSession.worldY = Number(config.worldY) || 0;
        state.textInputSession.baseText = String(config.text || '');
        state.textInputSession.color = config.color || state.color;
        state.textInputSession.size = clampNumber(config.size, 10, 120, 18);

        const cleanupBlur = () => {
            finishTextInput({ commit: true });
        };
        editor.addEventListener('blur', cleanupBlur, { once: true });
        editor.addEventListener('keydown', handleInlineTextEditorKeyDown);

        window.requestAnimationFrame(() => {
            editor.focus();
            const length = editor.value.length;
            editor.setSelectionRange(length, length);
        });
    }

    function handleInlineTextEditorKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelTextInput();
            return;
        }

        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            finishTextInput({ commit: true });
        }
    }

    function finishTextInput(options = {}) {
        if (!state.textInputSession.active) return;

        const commit = options.commit !== false;
        const silent = options.silent === true;
        const session = { ...state.textInputSession };
        const editor = state.textInputSession.editorEl;
        const draft = String(editor ? editor.value : '');
        const nextText = draft.trim();

        if (editor) {
            editor.removeEventListener('keydown', handleInlineTextEditorKeyDown);
            if (editor.parentNode) {
                editor.parentNode.removeChild(editor);
            }
        }

        state.textInputSession.active = false;
        state.textInputSession.editorEl = null;
        state.textInputSession.mode = null;
        state.textInputSession.objectId = null;
        state.textInputSession.worldX = 0;
        state.textInputSession.worldY = 0;
        state.textInputSession.baseText = '';
        state.textInputSession.color = state.color;
        state.textInputSession.size = Math.max(14, state.size * 3);

        if (!commit) {
            render();
            return;
        }

        if (session.mode === 'new') {
            if (!nextText) {
                render();
                if (!silent) setStatus('Da huy them text.', 'info');
                return;
            }

            commitHistorySnapshot();
            const newTextObject = {
                id: createObjectId(),
                type: 'text',
                x: roundTo(session.worldX, 2),
                y: roundTo(session.worldY, 2),
                text: nextText,
                color: session.color || state.color,
                size: clampNumber(session.size, 10, 120, 18)
            };

            state.objects.push(newTextObject);
            state.selectedObjectId = newTextObject.id;
            updateUndoRedoButtons();
            updateCursor();
            render();
            scheduleSave();
            if (!silent) setStatus('Da them ghi chu text.', 'success');
            return;
        }

        if (session.mode === 'edit') {
            const objectItem = getObjectById(session.objectId);
            if (!objectItem || objectItem.type !== 'text') {
                render();
                return;
            }

            const previousText = String(session.baseText || '').trim();
            if (nextText === previousText) {
                render();
                if (!silent) setStatus('Khong co thay doi noi dung text.', 'info');
                return;
            }

            commitHistorySnapshot();

            if (!nextText) {
                state.objects = state.objects.filter((item) => item.id !== objectItem.id);
                clearObjectSelection({ skipRender: true });
                updateUndoRedoButtons();
                updateCursor();
                render();
                scheduleSave();
                if (!silent) setStatus('Da xoa text rong.', 'warning');
                return;
            }

            objectItem.text = nextText;
            objectItem.color = session.color || objectItem.color || state.color;
            objectItem.size = clampNumber(session.size, 10, 120, objectItem.size || 18);
            state.selectedObjectId = objectItem.id;
            updateUndoRedoButtons();
            updateCursor();
            render();
            scheduleSave();
            if (!silent) setStatus('Da cap nhat noi dung text.', 'success');
            return;
        }

        render();
    }

    function cancelTextInput() {
        finishTextInput({ commit: false, silent: true });
        setStatus('Da huy nhap text.', 'info');
    }

    function positionInlineTextEditor(editor, worldPoint, fontSize = 18) {
        if (!editor || !elements.canvas || !elements.canvasWrap) return;

        const point = worldToScreen(worldPoint);
        const canvasLeft = elements.canvas.offsetLeft || 0;
        const canvasTop = elements.canvas.offsetTop || 0;
        const canvasWidth = elements.canvas.clientWidth || 0;
        const canvasHeight = elements.canvas.clientHeight || 0;

        const width = Math.max(140, Math.min(320, Math.round(canvasWidth * 0.48)));
        const safeFontSize = clampNumber(fontSize, 10, 120, 18);
        const height = Math.max(54, Math.round(safeFontSize * 2.4));

        const minLeft = canvasLeft + 4;
        const minTop = canvasTop + 4;
        const maxLeft = (canvasLeft + canvasWidth) - width - 4;
        const maxTop = (canvasTop + canvasHeight) - height - 4;

        const left = clampNumber(canvasLeft + point.x, minLeft, Math.max(minLeft, maxLeft), minLeft);
        const top = clampNumber(canvasTop + point.y, minTop, Math.max(minTop, maxTop), minTop);

        editor.style.left = `${roundTo(left, 2)}px`;
        editor.style.top = `${roundTo(top, 2)}px`;
        editor.style.width = `${width}px`;
        editor.style.minHeight = `${height}px`;
    }

    function setTool(tool) {
        if (!['pen', 'eraser', 'text', 'pan', 'rect', 'circle'].includes(tool)) {
            return;
        }

        if (state.textInputSession.active) {
            finishTextInput({ commit: true, silent: true });
        }

        state.tool = tool;
        updateToolUI();
        updateCursor();
        scheduleSave();
    }

    function updateToolUI() {
        elements.toolButtons.forEach((button) => {
            const isActive = button.dataset.tool === state.tool;
            button.classList.toggle('active', isActive);
        });
    }

    function updateSizeUI() {
        if (elements.sizeInput) {
            elements.sizeInput.value = String(state.size);
        }
        if (elements.sizeValue) {
            elements.sizeValue.textContent = String(state.size);
        }
    }

    function updateUndoRedoButtons() {
        if (elements.undoBtn) {
            elements.undoBtn.disabled = state.history.past.length === 0;
        }
        if (elements.redoBtn) {
            elements.redoBtn.disabled = state.history.future.length === 0;
        }
    }

    function updateCursor() {
        if (!elements.canvas) return;

        if (state.objectDragSession.active || state.panSession.active) {
            elements.canvas.style.cursor = 'grabbing';
            return;
        }

        const hasSelectedMovable = Boolean(getSelectedMovableObject());

        if (state.tool === 'pan') {
            elements.canvas.style.cursor = hasSelectedMovable ? 'move' : 'grab';
            return;
        }
        if (state.tool === 'text') {
            elements.canvas.style.cursor = hasSelectedMovable ? 'move' : 'text';
            return;
        }
        if (state.tool === 'eraser') {
            elements.canvas.style.cursor = 'cell';
            return;
        }

        elements.canvas.style.cursor = 'crosshair';
    }

    function resizeCanvas() {
        if (!elements.canvasWrap || !elements.canvas) return;

        const rect = elements.canvasWrap.getBoundingClientRect();
        const width = Math.max(320, Math.floor(rect.width));
        const height = Math.max(220, Math.floor(rect.height));
        const dpr = window.devicePixelRatio || 1;

        elements.canvas.width = Math.floor(width * dpr);
        elements.canvas.height = Math.floor(height * dpr);
        elements.canvas.style.width = `${width}px`;
        elements.canvas.style.height = `${height}px`;

        const ctx = elements.canvas.getContext('2d');
        if (!ctx) {
            setStatus('Trinh duyet khong ho tro canvas.', 'error');
            return;
        }

        state.ctx = ctx;
        state.canvasSize = { width, height, dpr };
    }

    function render() {
        if (!state.ctx) return;

        const { width, height, dpr } = state.canvasSize;
        state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        state.ctx.clearRect(0, 0, width, height);

        state.ctx.fillStyle = '#ffffff';
        state.ctx.fillRect(0, 0, width, height);

        state.objects.forEach((objectItem) => {
            drawObject(state.ctx, objectItem);
        });

        if (state.drawSession.active && state.drawSession.points.length > 0) {
            drawPath(state.ctx, {
                type: 'path',
                mode: state.tool === 'eraser' ? 'erase' : 'draw',
                color: state.color,
                size: state.size,
                points: state.drawSession.points
            }, true);
        }

        if (state.shapeSession.active) {
            const previewShape = buildPreviewShapeFromSession();
            if (previewShape) {
                drawShape(state.ctx, previewShape, true);
            }
        }

        const selectedObject = getSelectedMovableObject();
        if (selectedObject) {
            drawSelectedOutline(state.ctx, selectedObject);
        }
    }

    function drawObject(ctx, objectItem) {
        if (!objectItem || typeof objectItem !== 'object') return;

        if (objectItem.type === 'path') {
            drawPath(ctx, objectItem, false);
            return;
        }
        if (objectItem.type === 'text') {
            drawText(ctx, objectItem);
            return;
        }
        if (objectItem.type === 'shape') {
            drawShape(ctx, objectItem, false);
        }
    }

    function drawPath(ctx, pathObject, isPreview) {
        const points = Array.isArray(pathObject.points) ? pathObject.points : [];
        if (points.length === 0) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Number(pathObject.size) || 2;

        if (pathObject.mode === 'erase') {
            ctx.strokeStyle = '#ffffff';
            if (points.length === 1) {
                const dot = worldToScreen(points[0]);
                ctx.beginPath();
                ctx.fillStyle = '#ffffff';
                ctx.arc(dot.x, dot.y, (ctx.lineWidth / 2), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            }
        } else {
            ctx.strokeStyle = pathObject.color || '#2f6fed';
        }

        if (isPreview) {
            ctx.globalAlpha = 0.85;
        }

        ctx.beginPath();
        const firstPoint = worldToScreen(points[0]);
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < points.length; i += 1) {
            const point = worldToScreen(points[i]);
            ctx.lineTo(point.x, point.y);
        }

        if (points.length === 1) {
            ctx.lineTo(firstPoint.x + 0.01, firstPoint.y + 0.01);
        }

        ctx.stroke();
        ctx.restore();
    }

    function drawText(ctx, textObject) {
        const text = String(textObject.text || '');
        if (!text) return;

        const point = worldToScreen({ x: Number(textObject.x) || 0, y: Number(textObject.y) || 0 });
        const size = clampNumber(Number.parseInt(textObject.size, 10), 10, 120, 18);

        ctx.save();
        ctx.fillStyle = textObject.color || '#1f2937';
        ctx.font = `${size}px var(--font-body, sans-serif)`;
        ctx.textBaseline = 'top';

        const lines = text.split(/\r?\n/);
        const lineHeight = size * 1.2;
        for (let index = 0; index < lines.length; index += 1) {
            ctx.fillText(lines[index], point.x, point.y + (index * lineHeight));
        }

        ctx.restore();
    }

    function drawShape(ctx, shapeObject, isPreview) {
        if (!shapeObject || shapeObject.type !== 'shape') return;

        const x = Number(shapeObject.x) || 0;
        const y = Number(shapeObject.y) || 0;
        const width = Math.max(0, Number(shapeObject.width) || 0);
        const height = Math.max(0, Number(shapeObject.height) || 0);
        if (width < 0.1 || height < 0.1) return;

        const topLeft = worldToScreen({ x, y });

        ctx.save();
        ctx.strokeStyle = shapeObject.color || '#2f6fed';
        ctx.lineWidth = clampNumber(Number(shapeObject.size), 1, 24, 2);
        if (isPreview) {
            ctx.globalAlpha = 0.8;
            ctx.setLineDash([6, 4]);
        }

        if (shapeObject.shape === 'circle') {
            const centerX = topLeft.x + (width / 2);
            const centerY = topLeft.y + (height / 2);
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.strokeRect(topLeft.x, topLeft.y, width, height);
        }

        ctx.restore();
    }

    function drawSelectedOutline(ctx, objectItem) {
        let bounds = null;

        if (objectItem.type === 'text') {
            bounds = getTextBounds(objectItem, { padding: 8 });
        } else if (objectItem.type === 'shape') {
            bounds = getShapeBounds(objectItem, { padding: 6 });
        }

        if (!bounds) return;

        const topLeft = worldToScreen({ x: bounds.left, y: bounds.top });
        const rectWidth = bounds.width;
        const rectHeight = bounds.height;

        const handleSize = 8;
        const halfHandle = handleSize / 2;

        const handlePoints = [
            { x: topLeft.x, y: topLeft.y },
            { x: topLeft.x + (rectWidth / 2), y: topLeft.y },
            { x: topLeft.x + rectWidth, y: topLeft.y },
            { x: topLeft.x, y: topLeft.y + (rectHeight / 2) },
            { x: topLeft.x + rectWidth, y: topLeft.y + (rectHeight / 2) },
            { x: topLeft.x, y: topLeft.y + rectHeight },
            { x: topLeft.x + (rectWidth / 2), y: topLeft.y + rectHeight },
            { x: topLeft.x + rectWidth, y: topLeft.y + rectHeight }
        ];

        ctx.save();
        ctx.strokeStyle = '#5ea7ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(topLeft.x, topLeft.y, rectWidth, rectHeight);
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#5ea7ff';
        ctx.lineWidth = 1;

        for (const point of handlePoints) {
            ctx.beginPath();
            ctx.rect(point.x - halfHandle, point.y - halfHandle, handleSize, handleSize);
            ctx.fill();
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(topLeft.x + (rectWidth / 2), topLeft.y - 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    function commitHistorySnapshot() {
        state.history.past.push(deepClone(state.objects));
        if (state.history.past.length > HISTORY_LIMIT) {
            state.history.past.shift();
        }
        state.history.future = [];
    }

    function undo() {
        if (state.history.past.length === 0) return;

        state.history.future.push(deepClone(state.objects));
        state.objects = state.history.past.pop();
        ensureSelectedObjectStillExists();
        updateUndoRedoButtons();
        render();
        scheduleSave();
        setStatus('Da undo.', 'info');
    }

    function redo() {
        if (state.history.future.length === 0) return;

        state.history.past.push(deepClone(state.objects));
        if (state.history.past.length > HISTORY_LIMIT) {
            state.history.past.shift();
        }

        state.objects = state.history.future.pop();
        ensureSelectedObjectStillExists();
        updateUndoRedoButtons();
        render();
        scheduleSave();
        setStatus('Da redo.', 'info');
    }

    function clearBoard() {
        if (!state.objects.length) {
            setStatus('Bang dang trong.', 'info');
            return;
        }

        const confirmed = window.confirm('Ban chac chan muon xoa toan bo note tren bang?');
        if (!confirmed) return;

        commitHistorySnapshot();
        state.objects = [];
        clearObjectSelection({ skipRender: true });
        updateUndoRedoButtons();
        render();
        scheduleSave();
        setStatus('Da xoa toan bo noi dung bang.', 'warning');
    }

    function deleteSelectedObject() {
        if (!state.selectedObjectId) return;

        const targetId = state.selectedObjectId;
        const targetIndex = state.objects.findIndex((item) => item && item.id === targetId);
        if (targetIndex < 0) {
            clearObjectSelection({ skipRender: true });
            render();
            return;
        }

        commitHistorySnapshot();
        state.objects.splice(targetIndex, 1);
        clearObjectSelection({ skipRender: true });
        updateUndoRedoButtons();
        updateCursor();
        render();
        scheduleSave();
        setStatus('Da xoa doi tuong duoc chon.', 'warning');
    }

    function exportPng() {
        if (!elements.canvas) return;

        const dataUrl = elements.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `note_${classId}_${Date.now()}.png`;
        link.click();
        setStatus('Da xuat anh PNG.', 'success');
    }

    async function togglePresentMode() {
        if (state.isPresenting) {
            await exitPresentMode();
            return;
        }
        await enterPresentMode();
    }

    async function enterPresentMode() {
        state.isPresenting = true;
        elements.page.classList.add('class-note-presenting');
        document.body.classList.add('class-note-presenting-body');
        updatePresentButton();

        if (!document.fullscreenElement && elements.page.requestFullscreen) {
            try {
                await elements.page.requestFullscreen();
            } catch (error) {
                // Keep presentation mode even when fullscreen is blocked.
            }
        }

        window.requestAnimationFrame(() => {
            resizeCanvas();
            render();
        });
    }

    async function exitPresentMode() {
        state.isPresenting = false;
        elements.page.classList.remove('class-note-presenting');
        document.body.classList.remove('class-note-presenting-body');
        updatePresentButton();

        if (document.fullscreenElement && document.exitFullscreen) {
            try {
                await document.exitFullscreen();
            } catch (error) {
                // Ignore fullscreen exit errors.
            }
        }

        window.requestAnimationFrame(() => {
            resizeCanvas();
            render();
        });
    }

    function handleFullscreenChange() {
        if (!document.fullscreenElement && state.isPresenting) {
            state.isPresenting = false;
            elements.page.classList.remove('class-note-presenting');
            document.body.classList.remove('class-note-presenting-body');
            updatePresentButton();
            window.requestAnimationFrame(() => {
                resizeCanvas();
                render();
            });
        }
    }

    function updatePresentButton() {
        if (!elements.presentBtn) return;

        if (state.isPresenting) {
            elements.presentBtn.classList.remove('btn-primary');
            elements.presentBtn.classList.add('btn-warning');
            elements.presentBtn.innerHTML = '<i class="bi bi-fullscreen-exit me-1"></i> Thoat trinh chieu';
        } else {
            elements.presentBtn.classList.remove('btn-warning');
            elements.presentBtn.classList.add('btn-primary');
            elements.presentBtn.innerHTML = '<i class="bi bi-arrows-fullscreen me-1"></i> Trinh chieu';
        }
    }

    function scheduleSave() {
        if (state.saveTimer) {
            clearTimeout(state.saveTimer);
        }
        state.saveTimer = setTimeout(() => {
            persistToLocalStorage();
        }, AUTOSAVE_DELAY_MS);
    }

    function flushAutoSave() {
        if (state.textInputSession.active) {
            finishTextInput({ commit: true, silent: true });
        }
        if (state.saveTimer) {
            clearTimeout(state.saveTimer);
            state.saveTimer = null;
        }
        persistToLocalStorage();
    }

    function persistToLocalStorage() {
        const payload = {
            version: NOTE_VERSION,
            updatedAt: new Date().toISOString(),
            objects: state.objects,
            viewState: {
                tool: state.tool,
                color: state.color,
                size: state.size,
                offsetX: state.viewState.offsetX,
                offsetY: state.viewState.offsetY
            }
        };

        try {
            localStorage.setItem(state.storageKey, JSON.stringify(payload));
            setStatus('Da luu note cuc bo.', 'success');
        } catch (error) {
            if (isQuotaExceededError(error)) {
                setStatus('localStorage da day. Note moi van giu tam trong phien hien tai.', 'warning');
                return;
            }
            setStatus(`Loi luu note: ${error.message}`, 'error');
        }
    }

    function restoreFromLocalStorage() {
        const raw = localStorage.getItem(state.storageKey);
        if (!raw) {
            updateUndoRedoButtons();
            updateCursor();
            return;
        }

        try {
            const parsed = JSON.parse(raw);
            if (parsed.version !== NOTE_VERSION || !Array.isArray(parsed.objects)) {
                updateUndoRedoButtons();
                updateCursor();
                return;
            }

            state.objects = parsed.objects.filter(isValidObject);
            ensureSelectedObjectStillExists();

            const viewState = parsed.viewState || {};
            state.tool = ['pen', 'eraser', 'text', 'pan', 'rect', 'circle'].includes(viewState.tool)
                ? viewState.tool
                : state.tool;
            state.color = normalizeColor(viewState.color, state.color);
            state.size = clampNumber(viewState.size, 1, 24, state.size);
            state.viewState.offsetX = Number.isFinite(Number(viewState.offsetX)) ? Number(viewState.offsetX) : 0;
            state.viewState.offsetY = Number.isFinite(Number(viewState.offsetY)) ? Number(viewState.offsetY) : 0;

            if (elements.colorInput) {
                elements.colorInput.value = state.color;
            }

            setStatus('Da khoi phuc note cu tu trinh duyet.', 'success');
        } catch (error) {
            setStatus('Du lieu note cu bi loi, dung bang moi.', 'warning');
        }

        updateUndoRedoButtons();
        updateCursor();
    }

    function getCanvasPoint(event, options = {}) {
        const allowOutside = options.allowOutside === true;
        const rect = elements.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (!allowOutside && (x < 0 || y < 0 || x > rect.width || y > rect.height)) {
            return null;
        }

        if (allowOutside) {
            return {
                x: clampNumber(x, 0, rect.width, 0),
                y: clampNumber(y, 0, rect.height, 0)
            };
        }

        return { x, y };
    }

    function getObjectById(objectId) {
        if (!objectId) return null;
        return state.objects.find((item) => item && item.id === objectId) || null;
    }

    function getSelectedObject() {
        if (!state.selectedObjectId) return null;
        return getObjectById(state.selectedObjectId);
    }

    function getSelectedMovableObject() {
        const selectedObject = getSelectedObject();
        return isMovableObject(selectedObject) ? selectedObject : null;
    }

    function ensureSelectedObjectStillExists() {
        if (!state.selectedObjectId) return;
        if (!getObjectById(state.selectedObjectId)) {
            state.selectedObjectId = null;
        }
    }

    function selectObjectById(objectId) {
        const objectItem = getObjectById(objectId);
        if (!isMovableObject(objectItem)) {
            state.selectedObjectId = null;
        } else {
            state.selectedObjectId = objectItem.id;
        }
        updateCursor();
    }

    function clearObjectSelection(options = {}) {
        if (!state.selectedObjectId) return;
        state.selectedObjectId = null;
        updateCursor();
        if (!options.skipRender) {
            render();
        }
    }

    function findTextAtCanvasPoint(canvasPoint) {
        const worldPoint = screenToWorld(canvasPoint);

        for (let index = state.objects.length - 1; index >= 0; index -= 1) {
            const objectItem = state.objects[index];
            if (!objectItem || objectItem.type !== 'text') continue;

            const bounds = getTextBounds(objectItem, { padding: 10 });
            if (!bounds) continue;

            if (isPointInsideBounds(worldPoint, bounds)) {
                return objectItem;
            }
        }
        return null;
    }

    function findMovableObjectAtCanvasPoint(canvasPoint) {
        const worldPoint = screenToWorld(canvasPoint);

        for (let index = state.objects.length - 1; index >= 0; index -= 1) {
            const objectItem = state.objects[index];
            if (!isMovableObject(objectItem)) continue;

            if (objectItem.type === 'text') {
                const textBounds = getTextBounds(objectItem, { padding: 10 });
                if (textBounds && isPointInsideBounds(worldPoint, textBounds)) {
                    return objectItem;
                }
                continue;
            }

            if (objectItem.type === 'shape') {
                if (isPointInsideShape(worldPoint, objectItem, 8)) {
                    return objectItem;
                }
            }
        }

        return null;
    }

    function isPointInsideShape(worldPoint, shapeObject, padding = 0) {
        if (!shapeObject || shapeObject.type !== 'shape') return false;

        const x = Number(shapeObject.x) || 0;
        const y = Number(shapeObject.y) || 0;
        const width = Math.max(0, Number(shapeObject.width) || 0);
        const height = Math.max(0, Number(shapeObject.height) || 0);

        if (shapeObject.shape === 'circle') {
            const centerX = x + (width / 2);
            const centerY = y + (height / 2);
            const rx = Math.max(1, (width / 2) + padding);
            const ry = Math.max(1, (height / 2) + padding);
            const dx = (worldPoint.x - centerX) / rx;
            const dy = (worldPoint.y - centerY) / ry;
            return (dx * dx) + (dy * dy) <= 1;
        }

        return worldPoint.x >= (x - padding) &&
            worldPoint.x <= (x + width + padding) &&
            worldPoint.y >= (y - padding) &&
            worldPoint.y <= (y + height + padding);
    }

    function getTextBounds(textObject, options = {}) {
        if (!textObject || textObject.type !== 'text') return null;

        const size = clampNumber(Number.parseFloat(textObject.size), 10, 120, 18);
        const textValue = String(textObject.text || '');
        const lines = textValue.split(/\r?\n/);
        if (!lines.length) return null;

        const lineHeight = size * 1.2;
        let maxWidth = 0;

        if (state.ctx) {
            state.ctx.save();
            state.ctx.font = `${size}px var(--font-body, sans-serif)`;
            for (const line of lines) {
                maxWidth = Math.max(maxWidth, state.ctx.measureText(line).width);
            }
            state.ctx.restore();
        } else {
            for (const line of lines) {
                maxWidth = Math.max(maxWidth, line.length * size * 0.58);
            }
        }

        const x = Number(textObject.x) || 0;
        const y = Number(textObject.y) || 0;
        const padding = clampNumber(Number(options.padding), 0, 100, 0);
        const width = Math.max(maxWidth, size * 0.5) + (padding * 2);
        const height = Math.max(lines.length * lineHeight, lineHeight) + (padding * 2);

        return {
            left: x - padding,
            top: y - padding,
            width,
            height
        };
    }

    function getShapeBounds(shapeObject, options = {}) {
        if (!shapeObject || shapeObject.type !== 'shape') return null;

        const x = Number(shapeObject.x) || 0;
        const y = Number(shapeObject.y) || 0;
        const width = Math.max(0, Number(shapeObject.width) || 0);
        const height = Math.max(0, Number(shapeObject.height) || 0);
        const padding = clampNumber(Number(options.padding), 0, 100, 0);

        return {
            left: x - padding,
            top: y - padding,
            width: width + (padding * 2),
            height: height + (padding * 2)
        };
    }

    function buildPreviewShapeFromSession() {
        if (!state.shapeSession.active) return null;
        if (!state.shapeSession.shapeType) return null;

        const bounds = getShapeBoundsFromPoints(
            state.shapeSession.startWorldX,
            state.shapeSession.startWorldY,
            state.shapeSession.currentWorldX,
            state.shapeSession.currentWorldY
        );

        if (!bounds) return null;

        return {
            type: 'shape',
            shape: state.shapeSession.shapeType,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            color: state.color,
            size: state.size
        };
    }

    function getShapeBoundsFromPoints(startX, startY, endX, endY) {
        const x = Math.min(startX, endX);
        const y = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);
        return { x, y, width, height };
    }

    function screenToWorld(point) {
        return {
            x: point.x - state.viewState.offsetX,
            y: point.y - state.viewState.offsetY
        };
    }

    function worldToScreen(point) {
        return {
            x: point.x + state.viewState.offsetX,
            y: point.y + state.viewState.offsetY
        };
    }

    function compactPoints(points = []) {
        const result = [];
        for (const point of points) {
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
                continue;
            }
            const last = result[result.length - 1];
            if (!last || distance(last, point) >= 0.2) {
                result.push({
                    x: Number(point.x.toFixed(2)),
                    y: Number(point.y.toFixed(2))
                });
            }
        }
        return result;
    }

    function isMovableObject(objectItem) {
        return Boolean(objectItem && (objectItem.type === 'text' || objectItem.type === 'shape'));
    }

    function isValidObject(objectItem) {
        if (!objectItem || typeof objectItem !== 'object') return false;

        if (objectItem.type === 'path') {
            return Array.isArray(objectItem.points) && objectItem.points.length > 0;
        }

        if (objectItem.type === 'text') {
            return typeof objectItem.text === 'string' &&
                Number.isFinite(Number(objectItem.x)) &&
                Number.isFinite(Number(objectItem.y));
        }

        if (objectItem.type === 'shape') {
            return ['rect', 'circle'].includes(objectItem.shape) &&
                Number.isFinite(Number(objectItem.x)) &&
                Number.isFinite(Number(objectItem.y)) &&
                Number.isFinite(Number(objectItem.width)) &&
                Number.isFinite(Number(objectItem.height)) &&
                Number(objectItem.width) >= 0 &&
                Number(objectItem.height) >= 0;
        }

        return false;
    }

    function normalizeColor(value, fallback) {
        const color = String(value || '').trim();
        if (/^#[0-9a-fA-F]{6}$/.test(color)) {
            return color;
        }
        return fallback;
    }

    function clampNumber(value, min, max, fallback) {
        const number = Number.parseFloat(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(Math.max(number, min), max);
    }

    function roundTo(value, digits = 0) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 0;
        const factor = 10 ** digits;
        return Math.round(number * factor) / factor;
    }

    function deepClone(input) {
        if (typeof structuredClone === 'function') {
            return structuredClone(input);
        }
        return JSON.parse(JSON.stringify(input));
    }

    function distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    function isPointInsideBounds(point, bounds) {
        return point.x >= bounds.left &&
            point.x <= (bounds.left + bounds.width) &&
            point.y >= bounds.top &&
            point.y <= (bounds.top + bounds.height);
    }

    function createObjectId() {
        return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function isPrimaryPointer(event) {
        if (event.pointerType === 'touch') return true;
        return event.button === 0;
    }

    function isEditableElement(target) {
        if (!(target instanceof Element)) {
            return false;
        }

        if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) {
            return true;
        }

        if (target instanceof HTMLElement && target.isContentEditable) {
            return true;
        }

        return false;
    }

    function isQuotaExceededError(error) {
        return Boolean(
            error &&
            (error.name === 'QuotaExceededError' ||
                error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                error.code === 22 ||
                error.code === 1014)
        );
    }

    function setStatus(message, type = 'info') {
        if (!elements.status) return;

        elements.status.textContent = message;
        elements.status.classList.remove(
            'class-note-status--info',
            'class-note-status--success',
            'class-note-status--warning',
            'class-note-status--error'
        );
        elements.status.classList.add(`class-note-status--${type}`);
    }
}
