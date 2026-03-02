import { initEnshuAssistantBackground } from './functions/enshu_assistant/background.js';
import { initSessionManagerBackground } from './functions/session_manager/background.js';

initEnshuAssistantBackground();
initSessionManagerBackground();

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update') {
        chrome.tabs.create({ url: 'https://tast.jp/news/qpbepj66ztt3' });
    }
});
