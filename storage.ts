// 1. currentMemo: 현재 작성 중인 메모

function saveCurrentMemo(key: string, value: string) {
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

function loadCurrentMemo(key: string | undefined) {
    if (key == undefined) {
        return Promise.reject(new Error('key is undefined'));
    }
    return chrome.storage.local.get(key).then(result => {
        const res = result[key];
        return res as string;
    });
}

function clearCurrentMemo(key: string | undefined) {
    return chrome.storage.local.remove(key);
    // return Promise.reject(new Error('초기화실패'));
}

// 2. memories: 저장된 메모 목록

type MemoryItem = {id: string, title: string, content: string, createdAt: string};

function loadMemories( key: string | undefined ) : Promise<MemoryItem[]> {
    if (key == undefined) {
        return Promise.reject(new Error('key is undefined'));
    }
    return chrome.storage.local.get(key).then(result => {
        const res = result[key];
        return res as MemoryItem[];
    });
}

function addMemory (key: string | undefined, item: MemoryItem) : Promise<MemoryItem[]> {
    if (key == undefined) {
        return Promise.reject(new Error('key is undefined'));
    }
    // 기존 배열을 불러와서 맨 앞에 추가
    return chrome.storage.local.get(key).then(result => {
        const memories = result[key] as MemoryItem[];
        if (result[key] == undefined) {
            return chrome.storage.local.set({ [key]: [item] }).then(() => {
                return [item];
            });
        }
        memories.unshift(item);
        return chrome.storage.local.set({ [key]: memories }).then(() => {
            // 저장하고, "새 배열"을 리턴
            return memories;
        });
    });
}

    function deleteMemory (key: string | undefined, id: string) : Promise<MemoryItem[]> {
        if (key == undefined) {
            return Promise.reject(new Error('key is undefined'));
        }
        return chrome.storage.local.get(key).then(result => {
            const memories = result[key] as MemoryItem[];
            const filteredMemories = memories.filter(mem => mem.id !== id);
            return chrome.storage.local.set({ [key]: filteredMemories }).then(() => {
                return filteredMemories;
            });
        });
    }

export { saveCurrentMemo, loadCurrentMemo, clearCurrentMemo, loadMemories, addMemory, deleteMemory };
export type { MemoryItem };

