function saveMemoToStorage(key, value) {
    // return chrome.storage.local.set({ [key]: value })
    if (String(value).includes('!@#')) {
        // value에 '!'가 포함되어 있으면 의도적으로 Promise.reject로 에러를 리턴함.
        // 그런데 saveMemoToStorage를 호출한 쪽에서 catch나 에러 처리를 해주지 않으면
        // Uncaught (in promise) Error: 저장실패 와 같은 에러가 브라우저 콘솔에 뜰 수 있음.
        // 즉, 정상적으로 reject가 발생했지만, 이를 처리하지 않아서 콘솔에 에러가 노출되는 것임.
        return Promise.reject(new Error('저장실패'));
    }
    return chrome.storage.local.set({ [key]: value })
}

function loadMemo(key) {
    // chrome.storage.local.get()은 Promise를 반환하지 않고 void를 반환합니다.
    // Chrome Extension API는 콜백 기반이지만, Manifest V3에서는 Promise를 지원합니다.
    // 하지만 TypeScript 타입 정의가 제대로 되어있지 않거나, 
    // 또는 async/await 패턴을 사용해야 할 수도 있습니다.

    // 해결 방법 1: async/await 사용
    return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
            const res = result[key];
            resolve(res);
        });
    });

    // 해결 방법 2: 만약 Manifest V3를 사용 중이라면
    // return chrome.storage.local.get(key).then(result => {
    //     const res = result[key];
    //     return res;
    // });
}

function clearMemoFromStorage(key) {
    return chrome.storage.local.remove(key);
    // return Promise.reject(new Error('초기화실패'));
}

export { saveMemoToStorage, loadMemo, clearMemoFromStorage };

