import type { DestroyFn } from '../../types.ts';
import type { MarksheetDeletionOptions } from '../types.ts';

const MARKSHEET_INPUT_SELECTOR = 'input[type="radio"][name*="AnswerList"][name*="Nyuryokuchi"]' as const;

type RadioInput = HTMLInputElement;
type SelectionPredicate = (entry: RadioInput) => boolean;

const isMarksheetRadio = (node: unknown): node is HTMLInputElement => {
    if (!(node instanceof HTMLInputElement)) {
        return false;
    }

    if (node.type !== 'radio') {
        return false;
    }

    const name = node.name || '';
    return name.includes('AnswerList') && name.includes('Nyuryokuchi');
};

const isEditableTarget = (node: EventTarget | null): boolean => {
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

const dispatchMarksheetUpdate = (input: HTMLInputElement): void => {
    const inputEvent = new Event('input', { bubbles: true });
    const changeEvent = new Event('change', { bubbles: true });

    input.dispatchEvent(inputEvent);
    input.dispatchEvent(changeEvent);
};

const normalizeDigitKey = (event: KeyboardEvent): string | null => {
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

const isClickableNavigationControl = (element: unknown): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) {
        return false;
    }

    if (element instanceof HTMLButtonElement) {
        return !element.disabled;
    }

    if (element instanceof HTMLInputElement) {
        const type = element.type?.toLowerCase() || '';
        return ['submit', 'button'].includes(type) && !element.disabled;
    }

    return typeof element.click === 'function';
};

const triggerNavigationButton = (element: Element | null): boolean => {
    if (!isClickableNavigationControl(element)) {
        return false;
    }

    element.click();
    return true;
};

const parseIndexValue = (value: string | null | undefined): number | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

const getCurrentTargetIndex = (root: Document): number | null => {
        const targetIndexInput = findInRoot<HTMLInputElement>(root, '#targetIndex');
    if (targetIndexInput && typeof targetIndexInput.value === 'string') {
        const parsed = parseIndexValue(targetIndexInput.value);
        if (parsed != null) {
            return parsed;
        }
    }

        const currentIndexInput = findInRoot<HTMLInputElement>(root, '#currentIndex');
    if (currentIndexInput && typeof currentIndexInput.value === 'string') {
        const parsed = parseIndexValue(currentIndexInput.value);
        if (parsed != null) {
            return parsed;
        }
    }

    return null;
};

const getMaxTargetIndex = (root: Document): number | null => {
    const buttons = root.querySelectorAll('#daimon-buttons button.button-daimon');
    const count = buttons.length;

    if (count <= 0) {
        return null;
    }

    return count - 1;
};

const extractAnswerIndex = (input: RadioInput | null | undefined): number | null => {
    const name = input?.name || '';
    const match = name.match(/AnswerList\[(\d+)\]/);
    if (!match) {
        return null;
    }
    return Number(match[1]);
};

const findInRoot = <TElement extends Element = Element>(root: Document, selector: string): TElement | null => {
    if (selector.startsWith('#')) {
        const element = root.getElementById(selector.slice(1));
        return (element as TElement | null) ?? null;
    }

    return root.querySelector<TElement>(selector);
};

const setHiddenIndexValue = (element: RadioInput | null, index: number): void => {
    if (!element) {
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

const positionAtRadio = (root: Document, input: RadioInput | null): void => {
    if (!input) {
        return;
    }

    const index = extractAnswerIndex(input);
    if (index == null) {
        return;
    }

    const targetIndexInput = findInRoot<RadioInput>(root, '#targetIndex');
    const currentIndexInput = findInRoot<RadioInput>(root, '#currentIndex');

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

const removeFromHistory = (history: RadioInput[], predicate: SelectionPredicate): void => {
    for (let index = history.length - 1; index >= 0; index -= 1) {
        if (predicate(history[index])) {
            history.splice(index, 1);
        }
    }
};

const popLastActiveEntry = (history: RadioInput[]): RadioInput | null => {
    while (history.length > 0) {
        const candidate = history.pop();
        if (candidate && candidate.isConnected && candidate.checked) {
            return candidate;
        }
    }
    return null;
};

export const initMarksheetDeletion = ({ root = document }: MarksheetDeletionOptions = {}): DestroyFn => {
    if (!root) {
        return () => {};
    }

    const selectionHistory: RadioInput[] = [];
    const selectedByName = new Map<string, RadioInput>();
    const pendingStack: number[] = [];

    const removePendingIndex = (index: number | null | undefined): void => {
        if (index == null) {
            return;
        }
        for (let i = pendingStack.length - 1; i >= 0; i -= 1) {
            if (pendingStack[i] === index) {
                pendingStack.splice(i, 1);
            }
        }
    };

    const pushPendingIndex = (index: number | null | undefined): void => {
        if (index == null) {
            return;
        }
        removePendingIndex(index);
        pendingStack.push(index);
    };

    const recordSelection = (input: RadioInput | null): void => {
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

    const handleChange = (event: Event): void => {
        const target = event.target;
        if (target instanceof HTMLInputElement) {
            recordSelection(target);
        }
    };

    const handleKeydown = (event: KeyboardEvent): void => {
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
    const syncSelections = (): void => {
        const inputs = root.querySelectorAll<HTMLInputElement>(MARKSHEET_INPUT_SELECTOR);
        inputs.forEach((input) => {
            const current = selectedByName.get(input.name) || null;
            if (input.checked && input !== current) {
                recordSelection(input);
            } else if (!input.checked && current === input) {
                recordSelection(input);
            }
        });
    };

    const scheduleSync = (): void => {
        if (syncQueued) {
            return;
        }
        syncQueued = true;
        requestAnimationFrame(() => {
            syncQueued = false;
            syncSelections();
        });
    };

    const handleNavigationKeydown = (event: KeyboardEvent): void => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
            return;
        }

        if (isEditableTarget(event.target) || event.target instanceof HTMLSelectElement) {
            return;
        }

        const currentIndex = getCurrentTargetIndex(root);
        const maxIndex = getMaxTargetIndex(root);

        let selector: string | null = null;

        if (event.key === 'Enter' || event.key === 'ArrowRight') {
            if (currentIndex != null && maxIndex != null && currentIndex >= maxIndex) {
                return;
            }
            selector = '#nextDaimon';
        } else if (event.key === 'ArrowLeft') {
            if (currentIndex != null && currentIndex <= 0) {
                return;
            }
            selector = '#previousDaimon';
        }

        if (!selector) {
            return;
        }

        const button = findInRoot<Element>(root, selector);

        if (!triggerNavigationButton(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
    };

    const handleDigitKeydown = (event: KeyboardEvent): void => {
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

            const pendingIndex = pendingStack.pop() ?? null;
            const query = `input[name="AnswerList[${pendingIndex}].Nyuryokuchi"][value="${digit}"]`;
            const target = root.querySelector<HTMLInputElement>(query);

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
    root.addEventListener('keydown', handleNavigationKeydown, true);

    const destroy: DestroyFn = () => {
        root.removeEventListener('change', handleChange, true);
        root.removeEventListener('keydown', handleKeydown, true);
        root.removeEventListener('keydown', handleDigitKeydown, true);
        root.removeEventListener('keydown', handleNavigationKeydown, true);
        selectionHistory.length = 0;
        observer.disconnect();
        selectedByName.clear();
        pendingStack.length = 0;
    };

    const initializeExistingSelections = (): void => {
        const inputs = root.querySelectorAll<HTMLInputElement>(MARKSHEET_INPUT_SELECTOR);
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
