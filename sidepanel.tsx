import './sidepanel.css'
import { useEffect, useRef, useState } from 'react';
import { clearCurrentMemo, loadCurrentMemo, saveCurrentMemo, loadMemories, addMemory, deleteMemory, type MemoryItem } from './storage';

export default function Sidepanel() {
    const STORAGE_CURRENT_KEY = 'current-memo'
    const STORAGE_MEMORIES_KEY = 'saved-memos'
    const [memoText, setMemoText] = useState('');
    const [status, setStatus] = useState<"idle" | "typing" | "saved" | "error">("idle");
    const [isClearing, setIsClearing] = useState(false);
    const [toastText, setToastText] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [view,setView] = useState<'compose' | 'library'>('compose');


    const displayText = toastText !== '' ? toastText : status === 'idle' ? '' : status === 'typing' ? '입력 중...' : status === 'saved' ? '저장됨' : status === 'error' ? '저장 실패' : '';

    // useRef를 사용하는 이유:
    // 1. 컴포넌트가 리렌더링되어도 값이 유지됨 (일반 변수는 리렌더링 시 초기화됨)
    // 2. 값이 변경되어도 리렌더링을 트리거하지 않음 (useState와 다른 점)
    // 3. setTimeout/setInterval의 ID를 저장하기에 적합
    //    - 리렌더링 시에도 타이머 ID가 유지되어야 clearTimeout/clearInterval 가능
    //    - 타이머 ID 변경이 화면 업데이트를 유발할 필요가 없음
    // 만약 일반 변수(let)로 선언하면, 컴포넌트가 리렌더링될 때마다
    // 변수가 null로 초기화되어 이전 타이머를 clear할 수 없게 됩니다.
    const debounceTimer = useRef<number | null>(null);
    const setDefaultTimer = useRef<number | null>(null);
    const clearMemoTimer = useRef<number | null>(null);
    const toastTimer = useRef<number | null>(null);
    const memoRef = useRef<HTMLTextAreaElement>(null);

    function showToast(text: string) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastText(text);
        toastTimer.current = window.setTimeout(() => {
            setToastText('');
        }, 1000);
    }

    useEffect(() => {
        const currentMemo = loadCurrentMemo(STORAGE_CURRENT_KEY);
        const memories = loadMemories(STORAGE_MEMORIES_KEY);
        Promise.all(
            [
                currentMemo,
                memories
            ]
        ).then(([currentMemo, memories]) => {
            if (currentMemo != undefined) {
                setMemoText(currentMemo);
            }
            if (memories != undefined) {
                setMemories(memories);
            }
        })
        .catch(err => {
                showToast(err.message)
            });
    }, []);

    useEffect(() => 
        () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            if (setDefaultTimer.current) clearTimeout(setDefaultTimer.current);
            if (clearMemoTimer.current) clearTimeout(clearMemoTimer.current);
            if (toastTimer.current) clearTimeout(toastTimer.current);        
}, []);

    return (
        <div className={"container" + (view === 'library' ? ' library' : '')}>
            <div className="header">
                <h1 className="title">Memo</h1>
                {
                    view === 'compose' && (
                    <div className="header-buttons">
                <button id="save" disabled={isAdding} onClick={() => {
                    if (isAdding) return;
                    setIsAdding(true);
                    if (!memoText.trim()) {
                        showToast('메모를 입력해주세요');
                        setIsAdding(false);
                        return;
                    };
                    const item: MemoryItem ={
                        id: crypto.randomUUID(),
                        title: memoText.slice(0, 10),
                        content: memoText,
                        createdAt: new Date().toISOString(),
                    }
                    addMemory(STORAGE_MEMORIES_KEY, item).then(newList => {
                        showToast('기억함')
                        setMemoText('')
                        setMemories(newList);
                        memoRef.current?.focus();
                    }).catch(err => {
                        showToast(err.message)
                    }).finally(() => {
                        setIsAdding(false);
                    });
                }}>기억</button>
                <button id="clear" disabled={isClearing} onClick={() => {
                    if (isClearing) return;
                    setIsClearing(prev => {
                        return true;
                    });
                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                    clearCurrentMemo(STORAGE_CURRENT_KEY).then(() => {
                        setMemoText('')
                        showToast('초기화 완료')
                    }).catch(err => {
                        if (clearMemoTimer.current) clearTimeout(clearMemoTimer.current);
                        const backupText = memoText;
                        setMemoText('');
                        clearMemoTimer.current = window.setTimeout(() => {
                            setMemoText(backupText);
                        }, 30); 
                        showToast(err.message)
                        if (setDefaultTimer.current) {
                            clearTimeout(setDefaultTimer.current);
                        }
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                    }).finally(() => {
                        setIsClearing(false);
                    });
                }}>메모 초기화</button>
                </div>
            )}
            </div>

            <textarea ref={memoRef} id="memo" placeholder="여기에 메모를 적어보세요" value={memoText} disabled={isClearing} onChange={(e) => {
                const value = e.target.value
                setMemoText(value)
                setStatus('typing')
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                }
                if (setDefaultTimer.current) { clearTimeout(setDefaultTimer.current); }
                debounceTimer.current = window.setTimeout(() => {
                    saveCurrentMemo(STORAGE_CURRENT_KEY, value).then(() => {
                        setStatus('saved')
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                    }).catch(err => {
                        setStatus('error')
                        setDefaultTimer.current = window.setTimeout(() => {
                            setStatus('idle')
                        }, 1000);
                        showToast(err.message)
                    });
                }, 500);
            }
            }></textarea>
            <div className="memory-container">
                <ul className="memory-list">
                {
                    (view === 'library' ? memories : memories.slice(0,5)).map(mem => {
                        return (
                    <li className="memory-item" key={mem.id} onClick={()=>{
                        setMemoText(mem.content);
                        setView('compose');
                    }}>
                            <div className="memory-title">{mem.title}</div>
                            <div className="memory-date">{new Date(mem.createdAt).
                            toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</div>
                            <span className="delete-button" onClick={
                                (e)=>{
                                    e.stopPropagation();
                                    deleteMemory(STORAGE_MEMORIES_KEY, mem.id).then(res => {
                                        showToast('삭제됨')
                                        setMemories(res);
                                    }).catch(err => {
                                        showToast(err.message)
                                    });
                                }
                            }>🗑</span>
                            </li>
                            )
                        })
                    }
                    </ul>
                    <button className="more-button" onClick={()=>{
                        setView('library');
                        if (view === 'library') {
                            setView('compose');
                        } else {
                            setView('library');
                        }
                    }}>{view === 'library' ? '메모하기' : '더보기'}</button>
            </div>

            <div className="status" id="status">{displayText}</div>
        </div>
    )


}