const MARKSHEET_INPUT_SELECTOR = 'input[type="radio"][name*="AnswerList"][name*="Nyuryokuchi"]';

const isMarksheetRadio = (node) => {
    if (!(node instanceof HTMLInputElement)) {
        return false;
    }

    if (node.type !== 'radio') {
        return false;
    }

    const name = node.name || '';
    return name.includes('AnswerList') && name.includes('Nyuryokuchi');
};

const isEditableTarget = (node) => {
    if (!(node instanceof HTMLElement)) {
        return false;
    }

    if (node.isContentEditable) {
        return true;
    }

    if (node instanceof HTMLInputElement) {
        const type = node.type?.toLowerCase() || 'text';
        return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(type);
    }

    if (node instanceof HTMLTextAreaElement) {
        return true;
    }

    return false;
};

const dispatchMarksheetUpdate = (input) => {
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });

    input.dispatchEvent(inputEvent);
    input.dispatchEvent(changeEvent);
};

const normalizeDigitKey = (event) => {
    if (/^[0-9]$/.test(event.key)) {
        return event.key;
    }

    if (typeof event.code === 'string' && event.code.startsWith('Numpad')) {
        const digit = event.code.replace('Numpad', '');
        if (/^[0-9]$/.test(digit)) {
            return digit;
        }
    }

    return null;
};

const extractAnswerIndex = (input) => {
    const name = input?.name || '';
    const match = name.match(/AnswerList\[(\d+)\]/);
    if (!match) {
        return null;
    }
    return Number(match[1]);
};

const findInRoot = (root, selector) => {
    if (!root) {
        return null;
    }
    if (typeof root.getElementById === 'function' && selector.startsWith('#')) {
        return root.getElementById(selector.slice(1));
    }
    if (typeof root.querySelector === 'function') {
        return root.querySelector(selector);
    }
    return null;
};

const setHiddenIndexValue = (element, index) => {
    if (!element || typeof element.value === 'undefined') {
        return;
    }
    const nextValue = String(index);
    if (element.value === nextValue) {
        return;
    }
    element.value = nextValue;
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(changeEvent);
};

const positionAtRadio = (root, input) => {
    const index = extractAnswerIndex(input);
    if (index == null) {
        return;
    }

    const targetIndexInput = findInRoot(root, '#targetIndex');
    const currentIndexInput = findInRoot(root, '#currentIndex');

    setHiddenIndexValue(targetIndexInput, index);
    setHiddenIndexValue(currentIndexInput, index);

    if (typeof input.focus === 'function') {
        try {
            input.focus({ preventScroll: true });
        } catch (error) {
            input.focus();
        }
    }
};

const removeFromHistory = (history, predicate) => {
    for (let index = history.length - 1; index >= 0; index -= 1) {
        if (predicate(history[index])) {
            history.splice(index, 1);
        }
    }
};

const popLastActiveEntry = (history) => {
    while (history.length > 0) {
        const candidate = history.pop();
        if (candidate && candidate.isConnected && candidate.checked) {
            return candidate;
        }
    }
    return null;
};

export const initMarksheetDeletion = ({ root = document } = {}) => {
    if (!root || typeof root.addEventListener !== 'function') {
        return () => {};
    }

    // Tracks the chronological order of answer selections for undo operations.
    const selectionHistory = [];
    const selectedByName = new Map();
    const pendingStack = [];

    const removePendingIndex = (index) => {
        if (index == null) {
            return;
        }
        for (let i = pendingStack.length - 1; i >= 0; i -= 1) {
            if (pendingStack[i] === index) {
                pendingStack.splice(i, 1);
            }
        }
    };

    const pushPendingIndex = (index) => {
        if (index == null) {
            return;
        }
        removePendingIndex(index);
        pendingStack.push(index);
    };

    const recordSelection = (input) => {
        if (!isMarksheetRadio(input)) {
            return;
        }

        const answerIndex = extractAnswerIndex(input);

        if (input.checked) {
            removeFromHistory(selectionHistory, (entry) => entry === input || entry.name === input.name);
            selectionHistory.push(input);
            selectedByName.set(input.name, input);
            removePendingIndex(answerIndex);
        } else {
            removeFromHistory(selectionHistory, (entry) => entry === input);
            if (selectedByName.get(input.name) === input) {
                selectedByName.delete(input.name);
            }
        }
    };

    const handleChange = (event) => {
        const target = event.target;
        recordSelection(target);
    };

    const handleKeydown = (event) => {
        if (event.key !== 'Backspace') {
            return;
        }

        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (isEditableTarget(event.target)) {
            return;
        }

        const lastEntry = popLastActiveEntry(selectionHistory);
        if (!lastEntry) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        lastEntry.checked = false;
        dispatchMarksheetUpdate(lastEntry);
        positionAtRadio(root, lastEntry);
        pushPendingIndex(extractAnswerIndex(lastEntry));
    };

    let syncQueued = false;
    const syncSelections = () => {
        const inputs = root.querySelectorAll(MARKSHEET_INPUT_SELECTOR);
        inputs.forEach((input) => {
            const current = selectedByName.get(input.name) || null;
            if (input.checked && input !== current) {
                recordSelection(input);
            } else if (!input.checked && current === input) {
                recordSelection(input);
            }
        });
    };

    const scheduleSync = () => {
        if (syncQueued) {
            return;
        }
        syncQueued = true;
        requestAnimationFrame(() => {
            syncQueued = false;
            syncSelections();
        });
    };

    const handleDigitKeydown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        const digit = normalizeDigitKey(event);
        if (digit == null) {
            return;
        }

        if (pendingStack.length > 0) {
            event.preventDefault();
            event.stopPropagation();

            const pendingIndex = pendingStack.pop();
            const query = `input[name="AnswerList[${pendingIndex}].Nyuryokuchi"][value="${digit}"]`;
            const target = typeof root.querySelector === 'function' ? root.querySelector(query) : null;

            if (target instanceof HTMLInputElement) {
                target.checked = true;
                recordSelection(target);
                dispatchMarksheetUpdate(target);
                positionAtRadio(root, target);
            } else {
                removePendingIndex(pendingIndex);
            }

            return;
        }

        scheduleSync();
    };

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target;
            if (!(target instanceof HTMLInputElement)) {
                continue;
            }
            recordSelection(target);
        }
    });

    observer.observe(root, {
        attributes: true,
        attributeFilter: ['checked'],
        subtree: true
    });

    root.addEventListener('change', handleChange, true);
    root.addEventListener('keydown', handleKeydown, true);
    root.addEventListener('keydown', handleDigitKeydown, true);

    const destroy = () => {
        root.removeEventListener('change', handleChange, true);
        root.removeEventListener('keydown', handleKeydown, true);
        root.removeEventListener('keydown', handleDigitKeydown, true);
        selectionHistory.length = 0;
        observer.disconnect();
        selectedByName.clear();
        pendingStack.length = 0;
    };

    const initializeExistingSelections = () => {
        const inputs = root.querySelectorAll(MARKSHEET_INPUT_SELECTOR);
        inputs.forEach((input) => {
            if (isMarksheetRadio(input) && input.checked) {
                selectionHistory.push(input);
                selectedByName.set(input.name, input);
            }
        });
    };

    initializeExistingSelections();

    return destroy;
};
